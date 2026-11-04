const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION } = require('./helpers');

// Real case: an old profile whose email carries invisible direction marks (U+202B/U+202C),
// next to the active profile with the clean email. Both have mutual likes with me.
const CLEAN  = 'gil@example.com';
const HIDDEN = '\u202b' + CLEAN + '\u202c';
const base = { phone: '0521234567', age: 30, hobby: 'בישול', hobbyDescription: '', romantic: false,
  hobbyImageUrl: '', profilePhotoURL: '', latitude: 32.0853, longitude: 34.7818 };
const users = [
  { ...base, fullName: 'גיל טל',  email: CLEAN,  city: 'פרדס חנה-כרכור' },
  { ...base, fullName: 'גיל שמש', email: HIDDEN, city: 'ירושלים' },
];
const san = e => e.replace(/[^\x20-\x7E]/g, '').replace(/@/g, '_at_').replace(/\./g, '_dot_');
const like = (from, to) => ({ id: `${san(from)}_${san(to)}`, from, to });
const likes = [
  like(MOCK_SESSION.email, CLEAN), like(CLEAN, MOCK_SESSION.email),
  like(MOCK_SESSION.email, HIDDEN), like(HIDDEN, MOCK_SESSION.email),
];

test.describe('Same person with an old like (hidden characters in the email)', () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page, { users, likes });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
  });

  test('appears once in קונקשנז\', as the active profile', async ({ page }) => {
    await page.click('#tabMatches');
    const cards = page.locator('#matchesList button[data-chat-email]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
    await expect(cards).toHaveCount(1);
    await expect(page.locator('#matchesList')).toContainText('גיל ט');
  });

  test('counts once in the bell, as the active profile', async ({ page }) => {
    await expect(page.locator('#bellBadge')).toHaveText('1', { timeout: 15000 });
    await page.click('#bellBtn');
    await expect(page.locator('#npPanelBody')).toContainText('גיל ט');
    await expect(page.locator('#npPanelBody')).not.toContainText('גיל ש');
  });
});
