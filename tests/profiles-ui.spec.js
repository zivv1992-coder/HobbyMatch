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
    await expect(page.locator('body')).toContainText('פעילויות');
    await expect(page.locator('body')).toContainText('חיבורים');
  });

  test('feed renders profile cards after load', async ({ page }) => {
    await page.goto('/profiles.html');
    await page.click('#tabDiscover');

    // Wait for feed grid to become visible
    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Should have at least one card
    const cards = grid.locator('[data-email]');
    await expect(cards.first()).toBeVisible({ timeout: 15000 });
  });

  test('card has social-media-post structure: avatar, image area, and heart button', async ({ page }) => {
    await page.goto('/profiles.html');
    await page.click('#tabDiscover');

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
    await page.click('#tabDiscover');

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
    await page.click('#tabDiscover');

    const grid = page.locator('#feedGrid');
    await expect(grid).toBeVisible({ timeout: 15000 });

    // Check one of the mock users appears
    await expect(grid).toContainText('דנה כהן', { timeout: 15000 });

    // Hobby hashtag badge should be present (span starting with #)
    await expect(
      grid.locator('span').filter({ hasText: /^#/ }).first()
    ).toBeVisible();
  });


  test('opens on the activities tab with "מה קורה סביבי"', async ({ page }) => {
    await page.goto('/profiles.html');
    await expect(page.locator('#paneEvents')).toBeVisible();
    await expect(page.locator('#paneDiscover')).toBeHidden();
    await expect(page.locator('#tabEvents')).toHaveClass(/active/);
    await expect(page.locator('#paneEvents')).toContainText('מה קורה סביבי');
    await expect(page.locator('#eventsHint')).toContainText('תל אביב');
  });

  test('"מי לפגוש" shows nearby people who share a hobby (shortened names)', async ({ page }) => {
    await page.goto('/profiles.html');
    const strip = page.locator('#meetStrip');
    await expect(strip).toContainText('דנה כ', { timeout: 15000 });   // ריצה, same city
    await expect(strip).not.toContainText('דנה כהן');
    await expect(strip).not.toContainText('יובל');                   // גיטרה — nothing shared
  });

  test('new activity asks for a city, defaulting to mine', async ({ page }) => {
    await page.goto('/profiles.html');
    await page.click('button:has-text("+ פעילות חדשה")');
    await expect(page.locator('#createEventOverlay')).toBeVisible();
    await expect(page.locator('#ev_city')).toHaveValue('תל אביב');
  });

});

test.describe('Profiles page — guest', () => {
  test('guest opens on "מי באזור" (activities are personal) without errors', async ({ page }) => {
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await page.goto('/profiles.html');
    await expect(page.locator('#paneDiscover')).toBeVisible();
    await expect(page.locator('#paneEvents')).toBeHidden();
    await expect(page.locator('#feedGrid [data-email]').first()).toBeVisible({ timeout: 15000 });
    expect(errors).toEqual([]);
  });
});

test.describe('Edit profile', () => {
  test('cards layout; "looking for" replaces the romantic switch and saves both fields', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, { ...MOCK_SESSION, romantic: true, wantToTry: ['קרמיקה'] });   // older profile: only the flag
    await page.goto('/profiles.html');
    await page.evaluate(() => openEditDrawer());

    const drawer = page.locator('#editDrawer');
    for (const title of ['📸 תמונות', '✍️ עליי', '💚 התחביבים שלי', '🤔 חושב/ת לנסות', '👤 פרטים']) {
      await expect(drawer).toContainText(title);
    }
    const look = page.locator('#ed_lookingFor');
    await expect(look.locator('button.on')).toHaveText(/היכרות רומנטית/);   // derived from romantic: true

    await look.locator('button:has-text("חברים")').click();
    await look.locator('button:has-text("היכרות רומנטית")').click();
    await page.click('#ed_saveBtn');
    await expect(page.locator('#editOverlay')).toBeHidden({ timeout: 10000 });

    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('hobbyMatchUser')));
    expect(session.lookingFor).toEqual(['friends']);
    expect(session.romantic).toBe(false);
    expect(session.wantToTry).toEqual(['קרמיקה']);
  });
});

test.describe('Create activity', () => {
  test('uses the profile hobby categories; no "אווירת המפגש"', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
    await page.click('button:has-text("+ פעילות חדשה")');
    await page.click('#org_btn_self');
    const modal = page.locator('#createEventOverlay');
    await expect(modal.locator('#ev_hobbyPicker')).toContainText('תנועה וספורט');
    await expect(modal).not.toContainText('אווירת המפגש');
    await expect(modal).not.toContainText('סוג פעילות');
  });
});
