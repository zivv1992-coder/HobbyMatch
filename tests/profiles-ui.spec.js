const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, injectSession, MOCK_SESSION, MOCK_FEED_USERS } = require('./helpers');

test.describe('Profiles page — redirect guard', () => {
  test('redirects to index.html when no session', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/profiles.html');
    // serve may redirect to / instead of /index.html — should NOT stay on profiles
    await expect(page).not.toHaveURL(/\/profiles/);
  });
});

test.describe('Profiles page — UI with session', () => {

  test.beforeEach(async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, MOCK_SESSION);
  });

  test('renders header with app name', async ({ page }) => {
    await page.goto('/profiles.html');
    await expect(page.locator('header, [class*="header"]').first()).toContainText('קונקשן');
  });

  test('renders discover, events, and matches tabs', async ({ page }) => {
    await page.goto('/profiles.html');
    await expect(page.locator('body')).toContainText('מי באזור');
    await expect(page.locator('body')).toContainText('אירועים');
    await expect(page.locator('body')).toContainText('חיבורים');
  });

  test('feed renders profile cards after load', async ({ page }) => {
    await page.goto('/profiles.html');

    // Wait for feed grid to become visible
    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Should have at least one card
    const cards = grid.locator('[data-email]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('card has social-media-post structure: avatar, image area, and heart button', async ({ page }) => {
    await page.goto('/profiles.html');

    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    const firstCard = grid.locator('[data-email]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    // Heart button (like button) should be present with SVG inside
    const likeBtn = firstCard.locator('button[data-liked]');
    await expect(likeBtn).toBeVisible();
    await expect(likeBtn.locator('svg')).toBeVisible();

    // Post image area (aspect-[4/5] div or img)
    const postImageArea = firstCard.locator('.relative');
    await expect(postImageArea).toBeVisible();

    // Hobby hashtag badge overlaid on image
    await expect(postImageArea.locator('[class*="rounded-full"]')).toBeVisible();
  });

  test('like button toggles state on click', async ({ page }) => {
    await page.goto('/profiles.html');

    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    const firstCard = grid.locator('[data-email]').first();
    await expect(firstCard).toBeVisible({ timeout: 15000 });

    const likeBtn = firstCard.locator('button[data-liked]');
    await expect(likeBtn).toBeVisible();

    // Read initial state
    const initialState = await likeBtn.getAttribute('data-liked');
    const expectedAfterClick = initialState === 'false' ? 'true' : 'false';

    // Click to toggle
    await likeBtn.click();

    // State should have flipped
    await expect(likeBtn).toHaveAttribute('data-liked', expectedAfterClick, { timeout: 8000 });

    // Label should reflect new state
    const label = likeBtn.locator('.like-label');
    if (expectedAfterClick === 'true') {
      await expect(label).toContainText('ביטול לייק');
    } else {
      await expect(label).toContainText('לייק');
    }
  });

  test('card displays user name and hobby hashtag', async ({ page }) => {
    await page.goto('/profiles.html');

    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Check one of the mock users appears
    await expect(grid).toContainText('דנה כהן', { timeout: 15000 });

    // Hobby hashtag badge should be present (span starting with #)
    await expect(
      grid.locator('span').filter({ hasText: /^#/ }).first()
    ).toBeVisible();
  });

});
