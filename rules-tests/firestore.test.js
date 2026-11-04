// Firestore rules on the emulator. Run: npm run test:rules (needs Java).
const { test, before, after, beforeEach, describe } = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const ADMIN = 'zivv1992@gmail.com';
const A = 'dana.k@gmail.com', B = 'yuval@gmail.com', C = 'noa@gmail.com';
const san = e => e.replace(/\./g, '_dot_').replace(/@/g, '_at_');
const pair = (x, y) => `${san(x)}_${san(y)}`;
const chatId = (x, y) => [san(x), san(y)].sort().join('__');

let env;
const as = (email, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified }).firestore();
const guest = () => env.unauthenticatedContext().firestore();
const seed = (fn) => env.withSecurityRulesDisabled(c => fn(c.firestore()));

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules',
    firestore: { rules: fs.readFileSync(path.join(__dirname, '..', 'firestore.rules'), 'utf8') },
  });
});
after(() => env.cleanup());
beforeEach(() => env.clearFirestore());

const userDoc = email => ({ email, fullName: 'דנה כ', city: 'תל אביב' });
const like = (from, to) => ({ from, to, createdAt: new Date() });
const request = (from, to, status = 'pending') => ({ from, to, text: 'היי', status, createdAt: new Date() });

describe('users + private contact', () => {
  test('anyone reads public profiles, nobody reads private ones', async () => {
    await seed(db => Promise.all([
      db.doc(`users/${san(A)}`).set(userDoc(A)),
      db.doc(`users/${san(A)}/private/contact`).set({ phone: '0501234567', fullName: 'דנה כהן' }),
    ]));
    await assertSucceeds(guest().doc(`users/${san(A)}`).get());
    await assertFails(guest().doc(`users/${san(A)}/private/contact`).get());
    await assertFails(as(B).doc(`users/${san(A)}/private/contact`).get());
    await assertSucceeds(as(A).doc(`users/${san(A)}/private/contact`).get());
    await assertSucceeds(as(ADMIN).doc(`users/${san(A)}/private/contact`).get());
  });

  test('only the owner or admin writes a profile', async () => {
    await assertSucceeds(as(A).doc(`users/${san(A)}`).set(userDoc(A)));
    await assertFails(as(B).doc(`users/${san(A)}`).update({ city: 'חיפה' }));
    await assertFails(guest().doc(`users/${san(A)}`).update({ city: 'חיפה' }));
    await assertSucceeds(as(A).doc(`users/${san(A)}`).update({ lastSeen: new Date() }));
    await assertSucceeds(as(ADMIN).doc(`users/${san(A)}`).update({ hobbyImages: [] }));
    await assertFails(as(A).doc(`users/${san(A)}`).delete());
    await assertSucceeds(as(ADMIN).doc(`users/${san(A)}`).delete());
  });

  test('an unverified email owns nothing', async () => {
    await assertFails(as(A, false).doc(`users/${san(A)}`).set(userDoc(A)));
    await assertFails(as(A, false).doc(`users/${san(A)}/private/contact`).set({ phone: '1' }));
    await seed(db => db.collection('reports').add({ reason: 'x' }));
    await assertFails(as(ADMIN, false).collection('reports').get());
  });

  test('a profile cannot claim someone else\'s email', async () => {
    await assertFails(as(A).doc(`users/${san(A)}`).set(userDoc(B)));
  });
});

describe('likes', () => {
  test('I like as myself only', async () => {
    await assertSucceeds(as(A).doc(`likes/${pair(A, B)}`).set(like(A, B)));
    await assertSucceeds(as(A).doc(`likes/${pair(A, B)}`).set(like(A, B)));   // liking again
    await assertFails(as(A).doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await assertFails(as(A).doc(`likes/${pair(A, C)}`).set(like(A, B)));      // id ≠ content
    await assertFails(guest().doc(`likes/${pair(A, B)}`).set(like(A, B)));
  });

  test('match check works whether or not the other like exists', async () => {
    await assertSucceeds(as(A).doc(`likes/${pair(B, A)}`).get());
    await seed(db => db.doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await assertSucceeds(as(A).doc(`likes/${pair(B, A)}`).get());
    await assertFails(as(C).doc(`likes/${pair(B, A)}`).get());
  });

  test('I list only my likes, admin lists all', async () => {
    await seed(db => db.doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await assertSucceeds(as(A).collection('likes').where('to', '==', A).get());
    await assertSucceeds(as(B).collection('likes').where('from', '==', B).get());
    await assertFails(as(C).collection('likes').where('to', '==', A).get());
    await assertFails(as(A).collection('likes').get());
    await assertSucceeds(as(ADMIN).collection('likes').get());
  });

  test('either side removes a like; strangers cannot', async () => {
    await seed(db => db.doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await assertFails(as(C).doc(`likes/${pair(B, A)}`).delete());
    await assertSucceeds(as(A).doc(`likes/${pair(B, A)}`).delete());
    await assertSucceeds(as(A).doc(`likes/${pair(A, C)}`).delete());          // already gone
  });

  test('accepting a request also writes the sender\'s like', async () => {
    await assertFails(as(A).doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await seed(db => db.doc(`message_requests/${pair(B, A)}`).set(request(B, A)));
    await assertSucceeds(as(A).doc(`likes/${pair(B, A)}`).set(like(B, A)));
    await seed(db => db.doc(`message_requests/${pair(C, A)}`).set(request(C, A, 'declined')));
    await assertFails(as(A).doc(`likes/${pair(C, A)}`).set(like(C, A)));
  });
});

describe('chats', () => {
  const msgs = (x, y) => `chats/${chatId(x, y)}/messages`;
  const match = (x, y) => seed(db => Promise.all([
    db.doc(`likes/${pair(x, y)}`).set(like(x, y)), db.doc(`likes/${pair(y, x)}`).set(like(y, x)),
  ]));

  test('only the two people read a chat', async () => {
    await assertSucceeds(as(A).collection(msgs(A, B)).orderBy('sentAt').get());
    await assertSucceeds(as(B).collection(msgs(A, B)).get());
    await assertFails(as(C).collection(msgs(A, B)).get());
    await assertFails(guest().collection(msgs(A, B)).get());
    await assertSucceeds(as(ADMIN).collection(msgs(A, B)).get());
  });

  test('matched people write as themselves', async () => {
    await assertFails(as(A).collection(msgs(A, B)).add({ from: A, text: 'היי', sentAt: new Date() }));
    await match(A, B);
    await assertSucceeds(as(A).collection(msgs(A, B)).add({ from: A, text: 'היי', sentAt: new Date() }));
    await assertFails(as(A).collection(msgs(A, B)).add({ from: B, text: 'מזויף', sentAt: new Date() }));
    await assertFails(as(C).collection(msgs(A, B)).add({ from: C, text: 'היי', sentAt: new Date() }));
  });

  test('accepting a request posts the sender\'s exact text', async () => {
    await seed(db => db.doc(`message_requests/${pair(B, A)}`).set(request(B, A)));
    await assertSucceeds(as(A).collection(msgs(A, B)).add({ from: B, text: 'היי', sentAt: new Date() }));
    await assertFails(as(A).collection(msgs(A, B)).add({ from: B, text: 'משהו אחר', sentAt: new Date() }));
  });

  test('messages cannot be edited or deleted', async () => {
    await match(A, B);
    await seed(db => db.doc(`${msgs(A, B)}/m1`).set({ from: A, text: 'היי' }));
    await assertFails(as(A).doc(`${msgs(A, B)}/m1`).update({ text: 'אחר' }));
    await assertFails(as(A).doc(`${msgs(A, B)}/m1`).delete());
  });
});

describe('message requests', () => {
  const ref = (db, x, y) => db.doc(`message_requests/${pair(x, y)}`);

  test('I send as myself, up to 300 characters', async () => {
    await assertSucceeds(ref(as(A), A, B).set(request(A, B)));
    await assertFails(ref(as(A), B, C).set(request(B, C)));
    await assertFails(ref(as(A), A, C).set({ ...request(A, C), text: 'א'.repeat(301) }));
    await assertFails(ref(as(A), A, C).set(request(A, C, 'accepted')));
  });

  test('checking for a request works before one exists', async () => {
    await assertSucceeds(ref(as(A), A, B).get());
  });

  test('only the two sides read it', async () => {
    await seed(db => ref(db, A, B).set(request(A, B)));
    await assertSucceeds(ref(as(A), A, B).get());
    await assertSucceeds(ref(as(B), A, B).get());
    await assertFails(ref(as(C), A, B).get());
    await assertSucceeds(as(B).collection('message_requests').where('to', '==', B).get());
    await assertFails(as(C).collection('message_requests').where('to', '==', B).get());
    await assertFails(as(C).collection('message_requests').get());
  });

  test('only the receiver answers, and only the status changes', async () => {
    await seed(db => ref(db, A, B).set(request(A, B)));
    await assertFails(ref(as(A), A, B).update({ status: 'accepted' }));
    await assertFails(ref(as(B), A, B).update({ text: 'אחר' }));
    await assertSucceeds(ref(as(B), A, B).update({ status: 'accepted' }));
    await assertFails(ref(as(B), A, B).delete());
  });
});

describe('activities', () => {
  const ev = { title: 'ריצה', createdBy: A, interested: [] };

  test('everyone reads; I create as myself', async () => {
    await seed(db => db.doc('events/e1').set(ev));
    await assertSucceeds(guest().collection('events').get());
    await assertSucceeds(as(A).collection('events').add(ev));
    await assertFails(as(B).collection('events').add(ev));
    await assertFails(guest().collection('events').add(ev));
  });

  test('others only join or leave', async () => {
    await seed(db => db.doc('events/e1').set(ev));
    await assertSucceeds(as(B).doc('events/e1').update({ interested: [{ email: B }] }));
    await assertFails(as(B).doc('events/e1').update({ title: 'אחר' }));
    await assertFails(guest().doc('events/e1').update({ interested: [] }));
  });

  test('the creator or admin deletes', async () => {
    await seed(db => db.doc('events/e1').set(ev));
    await assertFails(as(B).doc('events/e1').delete());
    await assertSucceeds(as(A).doc('events/e1').delete());
    await seed(db => db.doc('events/e2').set(ev));
    await assertSucceeds(as(ADMIN).doc('events/e2').delete());
  });
});

describe('feedback, reports, reviews, analytics', () => {
  test('feedback: signed-in write, admin read', async () => {
    await assertSucceeds(as(A).collection('feedback').add({ text: 'היי', userEmail: A }));
    await assertFails(as(A).collection('feedback').add({ text: 'היי', userEmail: B }));
    await assertFails(guest().collection('feedback').add({ text: 'היי', userEmail: A }));
    await assertFails(as(A).collection('feedback').get());
    await assertSucceeds(as(ADMIN).collection('feedback').get());
  });

  test('reports: signed-in write, admin reads and handles', async () => {
    await seed(db => db.doc('reports/r1').set({ status: 'pending', reporterEmail: A }));
    await assertSucceeds(as(A).collection('reports').add({ reporterEmail: A, reason: 'x', status: 'pending' }));
    await assertFails(as(A).collection('reports').add({ reporterEmail: B, reason: 'x', status: 'pending' }));
    await assertFails(as(A).doc('reports/r1').update({ status: 'handled' }));
    await assertFails(as(A).collection('reports').get());
    await assertSucceeds(as(ADMIN).doc('reports/r1').update({ status: 'handled' }));
    await assertSucceeds(as(ADMIN).doc('reports/r1').delete());
  });

  test('analytics stay anonymous-write, admin-read', async () => {
    await assertSucceeds(guest().collection('analytics_events').add({ event: 'landing_view' }));
    await assertFails(guest().collection('analytics_events').get());
    await assertSucceeds(as(ADMIN).collection('analytics_events').get());
  });
});
