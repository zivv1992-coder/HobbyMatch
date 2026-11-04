const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION } = require('./helpers');

const ID = 'test_at_example_dot_com';
const USER = { ...MOCK_SESSION, fullName: 'ישראל ישראלי', phone: '0501234567', hobbies: ['ריצה'] };
const writes = page => page.evaluate(() => window.__writes);
const to = (list, path) => list.find(w => w.path === path);

test.describe('Phone and full name stay private', () => {

  test('a new profile keeps phone and full name only in the private document', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/tahbiva.html');
    await page.evaluate(u => saveProfileToFirestore(u), USER);
    const w = await writes(page);
    const pub = to(w, `users/${ID}`), priv = to(w, `users/${ID}/private/contact`);
    expect(pub.data.fullName).toBe('ישראל י');
    expect(pub.data).not.toHaveProperty('phone');
    expect(priv.data).toEqual({ fullName: 'ישראל ישראלי', phone: '0501234567' });
  });

  test('editing the profile removes the phone from the public document', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/tahbiva.html');
    await page.evaluate(u => updateProfileInFirestore(u), USER);
    const w = await writes(page);
    const pub = to(w, `users/${ID}`), priv = to(w, `users/${ID}/private/contact`);
    expect(pub.data.fullName).toBe('ישראל י');
    expect(pub.data.phone).toBe('__delete__');
    expect(priv.data).toEqual({ fullName: 'ישראל ישראלי', phone: '0501234567' });
  });

  test('my own profile comes back complete', async ({ page }) => {
    const { phone, ...publicOnly } = { ...USER, fullName: 'ישראל י' };
    await setupFirebaseMock(page, { users: [publicOnly], contacts: { [ID]: { fullName: USER.fullName, phone } } });
    await page.goto('/tahbiva.html');
    const mine = await page.evaluate(e => getMyProfile(e), USER.email);
    expect(mine.fullName).toBe('ישראל ישראלי');
    expect(mine.phone).toBe('0501234567');
  });

  test('a user whose data was not copied yet still gets the full profile', async ({ page }) => {
    await setupFirebaseMock(page, { users: [USER] });
    await page.goto('/tahbiva.html');
    const mine = await page.evaluate(e => getMyProfile(e), USER.email);
    expect(mine.phone).toBe('0501234567');
  });
});

test.describe('Admin: one-time copy of existing users', () => {
  const adminEmail = 'zivv1992@gmail.com';
  const OLD = { ...USER };
  const DONE = { ...USER, email: 'done@example.com', fullName: 'דנה כ' };
  delete DONE.phone;
  const EVENT = {
    id: 'ev1', title: 'ריצה', createdBy: USER.email, creatorName: 'ישראל ישראלי', creatorPhone: '0501234567',
    organizerPhone: '0529999999',
    interested: [{ email: USER.email, name: 'ישראל ישראלי', display: 'ישראל י' }],
  };

  test.beforeEach(async ({ page }) => {
    page.on('dialog', d => d.accept());
    await setupFirebaseMock(page, { users: [OLD, DONE], events: [EVENT], authEmail: adminEmail });
    await page.goto('/admin.html');
    await expect(page.locator('#moveContactsBtn')).toBeVisible({ timeout: 15000 });
  });

  test('saves a backup, moves the data, leaves copied users alone, cleans activities', async ({ page }) => {
    const [download] = await Promise.all([page.waitForEvent('download'), page.click('#moveContactsBtn')]);
    expect(download.suggestedFilename()).toMatch(/backup.*\.json/);

    await expect.poll(async () => (await writes(page)).length).toBeGreaterThan(2);
    const w = await writes(page);
    expect(to(w, `users/${ID}/private/contact`).data).toEqual({ fullName: 'ישראל ישראלי', phone: '0501234567' });
    expect(to(w, `users/${ID}`).data).toEqual({ fullName: 'ישראל י', phone: '__delete__' });
    expect(w.filter(x => x.path.startsWith('users/done_at_'))).toEqual([]);

    const ev = to(w, 'events/ev1').data;
    expect(ev.creatorName).toBe('ישראל י');
    expect(ev.creatorPhone).toBe('0529999999');
    expect(ev.interested[0].name).toBe('ישראל י');
  });
});
