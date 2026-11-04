const { test, expect } = require('@playwright/test');
const { setupFirebaseMock } = require('./helpers');

test.describe('Register page (register.html)', () => {

  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page);
  });

  test('shows email input on load (login title)', async ({ page }) => {
    await page.goto('/register.html?mode=login');
    await expect(page.locator('#emailInput')).toBeVisible();
    await expect(page.locator('#step1')).toHaveClass(/active/);
  });

  test('shows email input on load (login mode)', async ({ page }) => {
    await page.goto('/register.html?mode=login');
    await expect(page.locator('#emailInput')).toBeVisible();
  });

  test('shows error when submitting empty email', async ({ page }) => {
    await page.goto('/register.html?mode=login');
    await page.click('#sendOtpBtn');
    const errEl = page.locator('#step1Error');
    await expect(errEl).not.toHaveClass(/hidden/);
  });

});
