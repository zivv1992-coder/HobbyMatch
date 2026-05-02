const functions = require('firebase-functions');
const admin     = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

// Sanitize email to match client-side document ID format
function sanitizeEmail(email) {
  return email.replace(/[^\x20-\x7E]/g, '').trim()
    .replace(/@/g, '_at_').replace(/\./g, '_dot_');
}

// Trigger: new like created → send push to the recipient
exports.onNewLike = functions.firestore
  .document('likes/{likeId}')
  .onCreate(async (snap) => {
    const { from, to } = snap.data();
    if (!from || !to) return null;

    // Get sender's name
    const senderDoc = await db.collection('users').doc(sanitizeEmail(from)).get();
    const senderName = senderDoc.exists ? (senderDoc.data().fullName || 'מישהו') : 'מישהו';

    // Get recipient's FCM token
    const recipientDoc = await db.collection('users').doc(sanitizeEmail(to)).get();
    if (!recipientDoc.exists) return null;
    const fcmToken = recipientDoc.data().fcmToken;
    if (!fcmToken) return null;

    // Send push notification
    const message = {
      token: fcmToken,
      notification: {
        title: '❤️ קיבלת לייק!',
        body:  `${senderName} שלח/ה לך לייק — אולי יש מאצ'?`,
      },
      webpush: {
        fcmOptions: {
          link: 'https://zivv1992-coder.github.io/hobby-match/profiles.html'
        }
      }
    };

    try {
      await admin.messaging().send(message);
    } catch (e) {
      console.error('FCM send error:', e);
    }
    return null;
  });
