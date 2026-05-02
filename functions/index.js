const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

function sanitizeEmail(email) {
  return email.replace(/[^\x20-\x7E]/g, '').trim()
    .replace(/@/g, '_at_').replace(/\./g, '_dot_');
}

async function sendPush(fcmToken, title, body, link) {
  if (!fcmToken) return;
  try {
    await admin.messaging().send({
      token: fcmToken,
      notification: { title, body },
      webpush: { fcmOptions: { link } }
    });
  } catch (e) {
    console.error('FCM send error:', e);
  }
}

const APP_URL = 'https://zivv1992-coder.github.io/hobby-match/profiles.html';

// 1. New like → push to recipient
exports.onNewLike = functions.firestore
  .document('likes/{likeId}')
  .onCreate(async (snap) => {
    const { from, to } = snap.data();
    if (!from || !to) return null;

    const senderDoc = await db.collection('users').doc(sanitizeEmail(from)).get();
    const senderName = senderDoc.exists ? (senderDoc.data().fullName || 'מישהו') : 'מישהו';

    const recipientDoc = await db.collection('users').doc(sanitizeEmail(to)).get();
    if (!recipientDoc.exists) return null;

    await sendPush(
      recipientDoc.data().fcmToken,
      '❤️ קיבלת לייק!',
      `${senderName} שלח/ה לך לייק — אולי יש מאצ'?`,
      APP_URL
    );
    return null;
  });

// 2. Mutual match → push to both sides
exports.onNewMatch = functions.firestore
  .document('likes/{likeId}')
  .onCreate(async (snap) => {
    const { from, to } = snap.data();
    if (!from || !to) return null;

    // Check if reverse like exists
    const reverseSnap = await db.collection('likes')
      .where('from', '==', to).where('to', '==', from).limit(1).get();
    if (reverseSnap.empty) return null;

    const [fromDoc, toDoc] = await Promise.all([
      db.collection('users').doc(sanitizeEmail(from)).get(),
      db.collection('users').doc(sanitizeEmail(to)).get()
    ]);

    const fromName = fromDoc.exists ? (fromDoc.data().fullName || 'מישהו') : 'מישהו';
    const toName   = toDoc.exists   ? (toDoc.data().fullName   || 'מישהו') : 'מישהו';

    await Promise.all([
      sendPush(fromDoc.data()?.fcmToken, '🎉 יש לך מאצ\'!', `${toName} אוהב/ת אותך בחזרה!`, APP_URL),
      sendPush(toDoc.data()?.fcmToken,   '🎉 יש לך מאצ\'!', `${fromName} אוהב/ת אותך בחזרה!`, APP_URL)
    ]);
    return null;
  });

// 3. New event → push to users with matching hobby
exports.onNewEvent = functions.firestore
  .document('events/{eventId}')
  .onCreate(async (snap) => {
    const event = snap.data();
    const hobbies = event.hobbies || event.associatedHobbies || [];
    if (!hobbies.length) return null;

    const usersSnap = await db.collection('users').where('hobby', 'in', hobbies.slice(0, 10)).get();
    const pushes = [];
    for (const userDoc of usersSnap.docs) {
      const { fcmToken, fullName } = userDoc.data();
      if (!fcmToken) continue;
      pushes.push(sendPush(
        fcmToken,
        '🎯 אירוע חדש שיכול לעניין אותך!',
        `${event.title} — ${event.location || ''}`.trim(),
        APP_URL + '?tab=events'
      ));
    }
    await Promise.all(pushes);
    return null;
  });

// 4. Daily inactivity reminder — users inactive for 3+ days
exports.dailyInactivityReminder = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
    const usersSnap = await db.collection('users')
      .where('lastSeen', '<', threeDaysAgo).get();

    const pushes = [];
    for (const userDoc of usersSnap.docs) {
      const { fcmToken, fullName } = userDoc.data();
      if (!fcmToken) continue;
      pushes.push(sendPush(
        fcmToken,
        '👋 מתגעגעים אליך!',
        `יש פרופילים חדשים שמחכים לך ב-HobbyMatch`,
        APP_URL
      ));
    }
    await Promise.all(pushes);
    return null;
  });
