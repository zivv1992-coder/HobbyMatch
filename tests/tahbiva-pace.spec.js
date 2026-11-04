const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, MOCK_FEED_USERS } = require('./helpers');

test.describe('Tahbiva — short texts, time to read', () => {
  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await page.goto('/tahbiva.html');
  });

  test('first screen is one short sentence', async ({ page }) => {
    const hi = page.locator('#hi');
    await expect(hi).toContainText('ביחד נגלה מה מעניין אותך ואז נמצא לך שותפים לתחביב');
    await expect(hi).not.toContainText('🎯');
    // The promise sits right above the button
    const promise = await hi.locator('p:has-text("בלי טפסים. מבטיחה 🤞")').boundingBox();
    const button  = await hi.locator('button:has-text("יאללה")').boundingBox();
    expect(button.y - (promise.y + promise.height)).toBeLessThan(24);
    expect(button.y - (promise.y + promise.height)).toBeGreaterThanOrEqual(0);
    await expect(hi).not.toContainText('נראה אילו אנשים');
  });

  test('a reply stays long enough to read; the last answer shows one line before moving on', async ({ page }) => {
    await page.click('#hi button:has-text("יאללה")');
    const tiles = page.locator('#totBox button.tile');
    const say   = page.locator('#totSay');
    const box   = page.locator('#totBox');

    // Lower bounds only: a slow machine can take longer, never shorter
    let t = Date.now();
    await tiles.first().click();
    await expect(say).toHaveText('יש משהו באוויר הפתוח 🌿');
    await expect(box).toContainText('מה עושה לך חשק לקום מהספה?', { timeout: 5000 });
    expect(Date.now() - t).toBeGreaterThanOrEqual(1500);

    await tiles.first().click();
    await expect(say).toHaveText('אהבתי! 🏃');
    await expect(box).toContainText('איך את/ה אוהב/ת לבלות עם אנשים?', { timeout: 5000 });

    t = Date.now();
    await tiles.first().click();
    await expect(say).toHaveText('יש לי כמה כיוונים בשבילך 🌱');
    await expect(page.locator('#interests')).toHaveClass(/active/, { timeout: 5000 });
    expect(Date.now() - t).toBeGreaterThanOrEqual(2300);
  });
});
