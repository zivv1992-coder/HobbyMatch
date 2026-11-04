const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION, MOCK_FEED_USERS } = require('./helpers');

const ME = { ...MOCK_SESSION };
const LINK = '/register.html?mode=signIn&oobCode=abc&apiKey=x';   // as Firebase returns it

// An old session saved once: unlike injectSession it is not planted again after the app clears it
async function plantOldSession(page, user) {
  await page.addInitScript(u => {
    if (sessionStorage.getItem('sessionPlanted')) return;
    sessionStorage.setItem('sessionPlanted', '1');
    localStorage.setItem('hobbyMatchUser', JSON.stringify(u));
  }, user);
}

test.describe('Real sign-in (Firebase Auth)', () => {

  test('an old saved session without a real sign-in is sent to log in again', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS, authEmail: null });
    await plantOldSession(page, ME);
    await page.goto('/profiles.html');
    await expect(page).toHaveURL(/register\.html\?mode=login/, { timeout: 15000 });
  });

  test('a session for a different email than the signed-in user is rejected', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS, authEmail: 'someone-else@example.com' });
    await plantOldSession(page, ME);
    await page.goto('/profiles.html');
    await expect(page).toHaveURL(/register\.html\?mode=login/, { timeout: 15000 });
  });

  test('a signed-in user stays in the app', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, ME);
    await page.goto('/profiles.html');
    await expect(page.locator('#navName')).toHaveText(ME.fullName, { timeout: 15000 });
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/profiles\.html/);
  });

  test('logout also signs out of Firebase', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, ME);
    await page.goto('/profiles.html');
    await page.evaluate(() => {
      window.addEventListener('pagehide', () => sessionStorage.setItem('out', String(!!window.__signedOut)));
    });
    await page.evaluate(() => handleLogout());
    await expect(page).toHaveURL(/index\.html/, { timeout: 15000 });
    expect(await page.evaluate(() => sessionStorage.getItem('out'))).toBe('true');
  });

  test('email: sends a sign-in link and says to check the mail, no code field', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/register.html?mode=login');
    await page.fill('#emailInput', 'new@example.com');
    await page.click('#sendOtpBtn');
    await expect(page.locator('#step2')).toHaveClass(/active/);
    await expect(page.locator('#step2')).toContainText('new@example.com');
    await expect(page.locator('#otpInput')).toHaveCount(0);
    const sent = await page.evaluate(() => window.__linkSent);
    expect(sent.email).toBe('new@example.com');
    expect(sent.url).toContain('register.html');
  });

  test('email link, same browser, existing user → into the app', async ({ page }) => {
    await setupFirebaseMock(page, { users: [ME], authEmail: null });
    await page.addInitScript(e => localStorage.setItem('hobbyMatchLinkEmail', e), ME.email);
    await page.goto(LINK);
    await expect(page).toHaveURL(/profiles\.html/, { timeout: 15000 });
  });

  test('email link on another device asks for the email, then signs in', async ({ page }) => {
    await setupFirebaseMock(page, { users: [ME], authEmail: null });
    await page.goto(LINK);
    await expect(page.locator('#step1')).toContainText('כדי לסיים');
    await page.fill('#emailInput', ME.email);
    await page.click('#sendOtpBtn');
    await expect(page).toHaveURL(/profiles\.html/, { timeout: 15000 });
  });

  test('new user from the email link continues to the profile step', async ({ page }) => {
    await setupFirebaseMock(page, { authEmail: null });
    await page.addInitScript(() => localStorage.setItem('hobbyMatchLinkEmail', 'new@example.com'));
    await page.goto(LINK);
    await expect(page.locator('#step3')).toHaveClass(/active/, { timeout: 15000 });
  });
});
