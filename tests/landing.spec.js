const { test, expect } = require('@playwright/test');
const { setupFirebaseMock } = require('./helpers');

test.describe('Landing page (index.html)', () => {

  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page);
  });

  test('renders Hebrew title and subtitle', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('h1')).toContainText('קונקשן');
    await expect(page.locator('p')).toContainText('מצא שותפים לתחביבים');
  });

  test('shows handshake emoji', async ({ page }) => {
    await page.goto('/index.html');
    await expect(page.locator('body')).toContainText('🤝');
  });

  test('register button links to register.html?mode=register', async ({ page }) => {
    await page.goto('/index.html');
    const regBtn = page.locator('a', { hasText: 'הרשמה' }).first();
    await expect(regBtn).toHaveAttribute('href', 'register.html?mode=register');
  });

  test('login button links to register.html?mode=login', async ({ page }) => {
    await page.goto('/index.html');
    const loginBtn = page.locator('a', { hasText: 'התחברות' });
    await expect(loginBtn).toHaveAttribute('href', 'register.html?mode=login');
  });

  test('redirects to profiles.html when session exists', async ({ page }) => {
    // Inject session before page loads
    await page.addInitScript(() => {
      localStorage.setItem('hobbyMatchUser', JSON.stringify({ email: 'test@example.com', fullName: 'Test' }));
    });
    await page.goto('/index.html');
    // serve may strip .html — match /profiles or /profiles.html
    await expect(page).toHaveURL(/\/profiles/);
  });

  test('stays on index when no session', async ({ page }) => {
    await page.goto('/index.html');
    // serve may serve index.html as / — should NOT be on profiles
    await expect(page).not.toHaveURL(/\/profiles/);
  });

});
