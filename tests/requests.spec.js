const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION, MOCK_FEED_USERS } = require('./helpers');

test.describe('Message requests', () => {

  test('"שלח הודעה" opens a ready-made message about a shared hobby and sends it', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
    await page.click('#tabDiscover');

    const btn = page.locator('#feedGrid [data-email="dana@example.com"] button[data-msg-email]');
    await expect(btn).toContainText('שלח הודעה', { timeout: 15000 });
    await btn.click();

    const text = page.locator('#mc_text');
    await expect(text).toBeVisible();
    await expect(text).toHaveValue(/היי דנה!.*ריצה/);   // first name only + shared hobby
    await page.click('#mc_send');

    await expect(page.locator('#messageComposer')).toHaveCount(0);
    await expect(btn).toContainText('ההודעה נשלחה');
  });

  test('incoming request shows under "בקשות" and in the bell; accepting opens the chat', async ({ page }) => {
    await setupFirebaseMock(page, {
      users: MOCK_FEED_USERS,
      requests: [{ from: 'dana@example.com', to: MOCK_SESSION.email, text: 'היי! בא לרוץ ביחד?', status: 'pending' }],
    });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');

    await expect(page.locator('#bellBadge')).toBeVisible({ timeout: 15000 });

    await page.click('#tabMatches');
    const box = page.locator('#requestsBox');
    await expect(box).toContainText('דנה כ', { timeout: 15000 });
    await expect(box).not.toContainText('דנה כהן');
    await expect(box).toContainText('בא לרוץ ביחד?');

    await box.locator('button:has-text("אישור")').click();
    await expect(box).toBeHidden();
    await expect(page.locator('#chatModal')).toBeVisible();
  });

  test('declining removes the request quietly', async ({ page }) => {
    await setupFirebaseMock(page, {
      users: MOCK_FEED_USERS,
      requests: [{ from: 'yuval@example.com', to: MOCK_SESSION.email, text: 'מנגן/ת גם?', status: 'pending' }],
    });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
    await page.click('#tabMatches');
    const box = page.locator('#requestsBox');
    await expect(box).toContainText('יובל', { timeout: 15000 });
    await box.locator('button:has-text("לא עכשיו")').click();
    await expect(box).toBeHidden();
    await expect(page.locator('#chatModal')).toBeHidden();
  });

});
