const { test, expect } = require('@playwright/test');
const { setupFirebaseMock } = require('./helpers');

test.describe('Register page (register.html)', () => {

  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page);
  });

  test('shows email input on load (register mode)', async ({ page }) => {
    await page.goto('/register.html?mode=register');
    await expect(page.locator('#emailInput')).toBeVisible();
    await expect(page.locator('#step1')).toHaveClass(/active/);
  });

  test('shows email input on load (login mode)', async ({ page }) => {
    await page.goto('/register.html?mode=login');
    await expect(page.locator('#emailInput')).toBeVisible();
  });

  test('shows error when submitting empty email', async ({ page }) => {
    await page.goto('/register.html?mode=register');
    await page.click('#sendOtpBtn');
    const errEl = page.locator('#step1Error');
    await expect(errEl).not.toHaveClass(/hidden/);
  });

  test('advances to OTP step after valid email (dev mode shows alert)', async ({ page }) => {
    // In dev mode, sendOTP calls alert() with the OTP — accept it
    let otpCode = null;
    page.on('dialog', async dialog => {
      // Dialog text: "[מצב פיתוח] קוד האימות שלך: 123456"
      const match = dialog.message().match(/(\d{6})/);
      if (match) otpCode = match[1];
      await dialog.accept();
    });

    await page.goto('/register.html?mode=register');
    await page.fill('#emailInput', 'test@example.com');
    await page.click('#sendOtpBtn');

    // Step 2 (OTP) should become active
    await expect(page.locator('#step2')).toHaveClass(/active/, { timeout: 10000 });
    expect(otpCode).toMatch(/^\d{6}$/);
  });

  test('shows error on wrong OTP', async ({ page }) => {
    page.on('dialog', dialog => dialog.accept()); // dismiss dev-mode alert

    await page.goto('/register.html?mode=register');
    await page.fill('#emailInput', 'test@example.com');
    await page.click('#sendOtpBtn');

    await expect(page.locator('#step2')).toHaveClass(/active/, { timeout: 10000 });
    await page.fill('#otpInput', '000000');
    await page.click('button:has-text("אמת קוד")');

    const errEl = page.locator('#step2Error');
    await expect(errEl).not.toHaveClass(/hidden/);
  });

});
