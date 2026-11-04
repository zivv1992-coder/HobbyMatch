// Storage rules on the emulator. Run: npm run test:rules (needs Java).
const { test, before, after } = require('node:test');
const fs = require('fs');
const path = require('path');
const { initializeTestEnvironment, assertSucceeds, assertFails } = require('@firebase/rules-unit-testing');

const A = 'dana.k@gmail.com', B = 'yuval@gmail.com', ADMIN = 'zivv1992@gmail.com';
const san = e => e.replace(/\./g, '_dot_').replace(/@/g, '_at_');
const IMG = new Uint8Array([1, 2, 3]);
const image = { contentType: 'image/jpeg' };
let env;
const as = (email, verified = true) =>
  env.authenticatedContext(email, { email, email_verified: verified }).storage();
const guest = () => env.unauthenticatedContext().storage();
const photo = `hobby-images/${san(A)}/0_1`;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-rules',
    storage: { rules: fs.readFileSync(path.join(__dirname, '..', 'storage.rules'), 'utf8') },
  });
});
after(() => env.cleanup());

test('I upload images to my own folder only', async () => {
  await assertSucceeds(as(A).ref(photo).put(IMG, image));
  await assertSucceeds(as(A).ref(`profile_photos/${san(A)}`).put(IMG, image));
  await assertFails(as(B).ref(photo).put(IMG, image));
  await assertFails(guest().ref(photo).put(IMG, image));
  await assertFails(as(A, false).ref(photo).put(IMG, image));
});

test('only images, under 10MB', async () => {
  await assertFails(as(A).ref(photo).put(IMG, { contentType: 'application/pdf' }));
  await assertFails(as(A).ref(photo).put(new Uint8Array(10 * 1024 * 1024), image));
});

test('anyone opens a photo; listing folders is closed', async () => {
  await as(A).ref(photo).put(IMG, image);
  await assertSucceeds(guest().ref(photo).getMetadata());
  await assertFails(guest().ref('hobby-images').listAll());
});

test('the owner or admin deletes', async () => {
  await as(A).ref(photo).put(IMG, image);
  await assertFails(as(B).ref(photo).delete());
  await assertSucceeds(as(A).ref(photo).delete());
  await as(A).ref(photo).put(IMG, image);
  await assertSucceeds(as(ADMIN).ref(photo).delete());
});
