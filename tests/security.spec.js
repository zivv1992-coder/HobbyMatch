const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION } = require('./helpers');

// Text other users type must never run as code (Firestore is writable by anyone until real auth)
const EVIL_HTML = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const EVIL_ATTR = '"><img src=x onerror="window.__xss=(window.__xss||0)+1">';
const EVIL_JS   = "דן'); window.__xss=(window.__xss||0)+1; //";

const EVIL_USERS = [
  { fullName: EVIL_ATTR + ' כהן', email: 'evil1@example.com', age: '30' + EVIL_HTML, city: 'תל אביב' + EVIL_HTML,
    hobby: 'ריצה, ' + EVIL_HTML, hobbies: ['ריצה', EVIL_HTML], hobbyDescription: EVIL_HTML,
    latitude: 32.0853, longitude: 34.7818 },
  { fullName: EVIL_JS + ' לוי', email: 'evil2@example.com', age: 31, city: 'תל אביב', hobby: 'ריצה', hobbies: ['ריצה'],
    latitude: 32.0853, longitude: 34.7818 },
];
const EVIL_EVENTS = [{
  id: 'ev1', title: EVIL_HTML, description: EVIL_HTML, location: EVIL_ATTR, organizerName: EVIL_HTML,
  creatorName: EVIL_HTML, associatedHobbies: ['ריצה', EVIL_HTML], hobby: 'ריצה',
  actionLinks: [{ type: 'link', url: 'javascript:window.__xss=99', label: EVIL_HTML }],
  dateTime: new Date(Date.now() + 86400000).toISOString(), interested: [], createdBy: 'evil1@example.com',
}];

test.describe('XSS — user text is shown, never run', () => {

  test('activities tab, discover cards, profile modal and like button stay inert', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await setupFirebaseMock(page, { users: EVIL_USERS, events: EVIL_EVENTS });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');

    // Activities (home tab): the evil activity renders as text
    await expect(page.locator('#eventsGrid')).toContainText('<img src=x', { timeout: 15000 });
    // "javascript:" links are neutralised
    expect(await page.locator('#eventsGrid a[href^="javascript:"]').count()).toBe(0);

    // Discover: cards + profile modal for both evil users
    await page.click('#tabDiscover');
    await expect(page.locator('#feedGrid [data-email]').first()).toBeVisible({ timeout: 15000 });
    for (const email of ['evil1@example.com', 'evil2@example.com']) {
      await page.locator(`#feedGrid [data-email="${email}"] .cursor-pointer`).first().click();
      await expect(page.locator('#profileModal')).toBeVisible();
      await page.locator('#modalLikeBtn').click();          // name with an apostrophe must not break out
      await page.evaluate(() => document.getElementById('profileModal')?.remove());
    }
    await page.locator('#feedGrid [data-email="evil2@example.com"] button[data-liked]').click();

    await page.waitForTimeout(500);
    expect(await page.evaluate(() => window.__xss)).toBeUndefined();
    expect(errors.filter(e => /SyntaxError|Unexpected/.test(e))).toEqual([]);
  });

});
