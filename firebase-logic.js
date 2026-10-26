// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeEmail(email) {
  return email.replace(/[^\x20-\x7E]/g, '').trim().replace(/@/g, '_at_').replace(/\./g, '_dot_');
}

// Returns clean 10-digit string or throws a Hebrew error
function sanitizePhone(raw) {
  const digits = String(raw).replace(/\D/g, '');
  if (digits.length !== 10 || !digits.startsWith('0')) {
    throw new Error('מספר הטלפון חייב להיות 10 ספרות ולהתחיל ב-0 (למשל 0501234567)');
  }
  return digits;
}

// ─── Storage ──────────────────────────────────────────────────────────────────

// Shrinks an image to max 1200px (longest side), JPEG quality 0.8, before upload.
// Falls back to the original file if it can't be decoded (e.g. HEIC) or if compression doesn't help.
async function compressImage(file, maxSize = 1200, quality = 0.8) {
  if (file.type === 'image/gif') return file; // keep animation
  try {
    const url = URL.createObjectURL(file);
    const img = await new Promise((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = reject;
      el.src = url;
    });
    URL.revokeObjectURL(url);

    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    const canvas = document.createElement('canvas');
    canvas.width  = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#ffffff'; // transparent PNG → white background instead of black
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch (err) {
    console.warn('כיווץ התמונה נכשל, מעלה את הקובץ המקורי', err);
    return file;
  }
}

async function uploadHobbyImage(file, email) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('הקובץ חייב להיות תמונה');
  }
  const ref = storage.ref(`hobby-images/${sanitizeEmail(email)}`);
  const snapshot = await ref.put(await compressImage(file));
  const downloadUrl = await snapshot.ref.getDownloadURL();
  return downloadUrl;
}

async function uploadProfilePhoto(file, email) {
  if (!file || !file.type.startsWith('image/')) {
    throw new Error('הקובץ חייב להיות תמונה');
  }
  const ref = storage.ref(`profile_photos/${sanitizeEmail(email)}`);
  const snapshot = await ref.put(await compressImage(file, 600));
  return snapshot.ref.getDownloadURL();
}

// ─── Firestore ────────────────────────────────────────────────────────────────

async function saveProfileToFirestore(userObj) {
  const docId = sanitizeEmail(userObj.email);
  await db.collection('users').doc(docId).set({
    fullName:         userObj.fullName,
    email:            userObj.email,
    phone:            userObj.phone,
    age:              userObj.age,
    city:             userObj.city,
    hobby:            userObj.hobby,
    hobbies:          userObj.hobbies || [],
    hobbyDescription: userObj.hobbyDescription,
    romantic:         userObj.romantic,
    hobbyImageUrl:    userObj.hobbyImageUrl,
    hobbyImages:      userObj.hobbyImages || [],
    lookingFor:       userObj.lookingFor || [],
    profilePhotoURL:  userObj.profilePhotoURL || '',
    latitude:         userObj.latitude,
    longitude:        userObj.longitude,
    createdAt:        firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ─── Likes & Matching ────────────────────────────────────────────────────────

async function getUserByEmail(email) {
  const doc = await db.collection('users').doc(sanitizeEmail(email)).get();
  return doc.exists ? doc.data() : null;
}

async function fetchAllUsers() {
  const snap = await db.collection('users').get();
  return snap.docs.map(doc => doc.data()).filter(u => u.fullName && u.email);
}

async function fetchLikedEmails(myEmail) {
  const snap = await db.collection('likes')
    .where('from', '==', myEmail)
    .get();
  return new Set(snap.docs.map(d => d.data().to));
}

async function saveLike(fromEmail, toEmail) {
  const docId = `${sanitizeEmail(fromEmail)}_${sanitizeEmail(toEmail)}`;
  await db.collection('likes').doc(docId).set({
    from:      fromEmail,
    to:        toEmail,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function removeLike(fromEmail, toEmail) {
  const docId = `${sanitizeEmail(fromEmail)}_${sanitizeEmail(toEmail)}`;
  await db.collection('likes').doc(docId).delete();
}

async function checkMatch(fromEmail, toEmail) {
  const reverseId = `${sanitizeEmail(toEmail)}_${sanitizeEmail(fromEmail)}`;
  const doc = await db.collection('likes').doc(reverseId).get();
  return doc.exists;
}

// ─── Message requests (write to someone before there's a match) ─────────────
// message_requests/{from}_{to}: { from, to, text, status: 'pending'|'accepted'|'declined', createdAt }

function messageRequestId(fromEmail, toEmail) {
  return `${sanitizeEmail(fromEmail)}_${sanitizeEmail(toEmail)}`;
}

async function getMessageRequest(fromEmail, toEmail) {
  const doc = await db.collection('message_requests').doc(messageRequestId(fromEmail, toEmail)).get();
  return doc.exists ? doc.data() : null;
}

async function sendMessageRequest(fromEmail, toEmail, text) {
  await db.collection('message_requests').doc(messageRequestId(fromEmail, toEmail)).set({
    from:      fromEmail,
    to:        toEmail,
    text:      text,
    status:    'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// Filtered client-side by status, so no composite index is needed
async function fetchIncomingRequests(myEmail) {
  const snap = await db.collection('message_requests').where('to', '==', myEmail).get();
  return snap.docs.map(d => d.data()).filter(r => r.status === 'pending');
}

// Accept = the existing match (likes both ways) + the request becomes the first chat message
async function acceptMessageRequest(req) {
  await Promise.all([saveLike(req.from, req.to), saveLike(req.to, req.from)]);
  const chatId = [sanitizeEmail(req.from), sanitizeEmail(req.to)].sort().join('__'); // same as _getChatId (profiles-chat.js)
  await db.collection('chats').doc(chatId).collection('messages').add({
    from:   req.from,
    text:   req.text,
    sentAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('message_requests').doc(messageRequestId(req.from, req.to)).update({ status: 'accepted' });
}

async function declineMessageRequest(req) {
  await db.collection('message_requests').doc(messageRequestId(req.from, req.to)).update({ status: 'declined' });
}

async function fetchMatches(myEmail) {
  // Get everyone I liked
  const likedSnap = await db.collection('likes')
    .where('from', '==', myEmail)
    .get();
  const likedEmails = likedSnap.docs.map(d => d.data().to);
  if (likedEmails.length === 0) return [];

  // Of those, find who liked me back
  const matches = [];
  for (const email of likedEmails) {
    const reverseId = `${sanitizeEmail(email)}_${sanitizeEmail(myEmail)}`;
    const doc = await db.collection('likes').doc(reverseId).get();
    if (doc.exists) {
      const userDoc = await db.collection('users').doc(sanitizeEmail(email)).get();
      if (userDoc.exists) matches.push(userDoc.data());
    }
  }
  return matches;
}

async function updateProfileInFirestore(userObj) {
  const docId = sanitizeEmail(userObj.email);
  const images = userObj.hobbyImages && userObj.hobbyImages.length
    ? userObj.hobbyImages
    : (userObj.hobbyImageUrl ? [userObj.hobbyImageUrl] : []);
  const updateObj = {
    fullName:         userObj.fullName,
    phone:            userObj.phone,
    age:              userObj.age,
    city:             userObj.city,
    hobby:            userObj.hobby,
    hobbies:          userObj.hobbies || [],
    hobbyDescription: userObj.hobbyDescription,
    romantic:         userObj.romantic,
    lookingFor:       userObj.lookingFor || [],
    hobbyImages:      images,
    hobbyImageUrl:    images[0] || '',
    latitude:         userObj.latitude,
    longitude:        userObj.longitude
  };
  if (userObj.profilePhotoURL !== undefined) {
    updateObj.profilePhotoURL = userObj.profilePhotoURL;
  }
  await db.collection('users').doc(docId).update(updateObj);
}

async function uploadHobbyImageIndexed(file, email, index) {
  if (!file || !file.type.startsWith('image/')) throw new Error('הקובץ חייב להיות תמונה');
  const ref = storage.ref(`hobby-images/${sanitizeEmail(email)}/${index}_${Date.now()}`);
  const snapshot = await ref.put(await compressImage(file));
  return snapshot.ref.getDownloadURL();
}

// ─── Reports ──────────────────────────────────────────────────────────────────

async function submitReport(reportedEmail, reporterEmail, reporterName, reason) {
  await db.collection('reports').add({
    reportedEmail,
    reporterEmail,
    reporterName,
    reason,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ─── Distance ─────────────────────────────────────────────────────────────────

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
