const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION, MOCK_FEED_USERS } = require('./helpers');

const me = MOCK_SESSION.email;
const [dana, yuval] = MOCK_FEED_USERS.map(u => u.email);
const badge = page => page.locator('#bellBadge');
const panel = page => page.locator('#npPanelBody');
const row   = (page, name) => panel(page).locator(`div.cursor-pointer:has-text("${name}")`);

async function closeBell(page) {
  await page.evaluate(() => closeNotifPanel());
  await expect(page.locator('#npPanel')).toBeHidden();
}

async function open(page, likes) {
  await setupFirebaseMock(page, { users: MOCK_FEED_USERS, likes });
  await injectSession(page, MOCK_SESSION);
  await page.goto('/profiles.html');
  await expect(badge(page)).toHaveText('2', { timeout: 15000 });
}

test.describe('Bell — a notification clears only when it is clicked', () => {

  test('opening the bell keeps new connections; clicking one clears only that one', async ({ page }) => {
    await open(page, [
      { from: me, to: dana }, { from: dana, to: me },
      { from: me, to: yuval }, { from: yuval, to: me },
    ]);

    await page.click('#bellBtn');
    await expect(row(page, 'דנה כ')).toBeVisible();
    await closeBell(page);
    await expect(badge(page)).toHaveText('2');

    await page.click('#bellBtn');
    await row(page, 'דנה כ').click();
    await expect(page.locator('#npPanel')).toBeHidden();
    await expect(badge(page)).toHaveText('1');

    await page.click('#bellBtn');
    await expect(row(page, 'יובל ל')).toBeVisible();
    await expect(row(page, 'דנה כ')).toHaveCount(0);

    await page.reload();                        // stays cleared after a refresh
    await expect(badge(page)).toHaveText('1', { timeout: 15000 });
  });

  test('clicking a like lowers the number and the row stays for liking back', async ({ page }) => {
    await open(page, [{ from: dana, to: me }, { from: yuval, to: me }]);

    await page.click('#bellBtn');
    await expect(row(page, 'דנה כ')).toBeVisible();
    await closeBell(page);
    await expect(badge(page)).toHaveText('2');

    await page.click('#bellBtn');
    await row(page, 'דנה כ').click();
    await expect(badge(page)).toHaveText('1');
    await page.evaluate(() => document.getElementById('profileModal')?.remove());

    await page.click('#bellBtn');
    await expect(row(page, 'דנה כ')).toBeVisible();
    await expect(row(page, 'יובל ל')).toBeVisible();
  });

  test('liking back from the bell does not add to the number', async ({ page }) => {
    await open(page, [{ from: dana, to: me }, { from: yuval, to: me }]);
    await page.click('#bellBtn');
    await row(page, 'דנה כ').locator('button:has-text("בחזרה")').click();
    await expect(page.locator('#matchPopup')).toBeVisible();
    await expect(badge(page)).toHaveText('1');
  });
});
