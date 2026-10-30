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

  test('activities tab shows only activities — no people strip', async ({ page }) => {
    await page.goto('/profiles.html');
    await expect(page.locator('#paneEvents')).toContainText('מה קורה סביבי');
    await expect(page.locator('#paneEvents')).not.toContainText('מי לפגוש');
    await expect(page.locator('#meetStrip')).toHaveCount(0);
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
    for (const title of ['📸 תמונות', '✍️ עליי', '💚 התחביבים שלי', '🌱 רוצה לנסות', 'עכשיו מחפש/ת שותפים ל', '👤 פרטים']) {
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

  test('hobby partners and want-to-try are editable', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, { ...MOCK_SESSION, partnerTypes: ['dance'] });
    await page.goto('/profiles.html');
    await page.evaluate(() => openEditDrawer());

    await expect(page.locator('#editDrawer h2')).toHaveText('הפרופיל שלי');
    const partners = page.locator('#ed_partnerTypes');
    const suggest  = page.locator('#ed_partnerSuggest');
    await expect(partners).toContainText('ריקוד ותנועה');
    await expect(suggest.locator('button')).toHaveCount(3);          // the presets not chosen yet
    await suggest.locator('button:has-text("טיולים")').click();    // + add a preset
    await page.fill('#ed_partnerInput', 'גלישה');                   // + add my own
    await page.click('#ed_partnerInput + button');
    await expect(partners).toContainText('גלישה');
    // Edit: tapping 'גלישה' moves it into the field
    await partners.locator('button:has-text("גלישה")').click();
    await expect(page.locator('#ed_partnerInput')).toHaveValue('גלישה');
    await page.fill('#ed_partnerInput', 'גלישת גלים');
    await page.click('#ed_partnerInput + button');
    // Remove: ✕ on ריקוד ותנועה
    await partners.locator('span:has-text("ריקוד ותנועה") button[aria-label="הסרה"]').click();
    await expect(partners).not.toContainText('ריקוד');
    await page.fill('#ed_wantToTryInput', 'קרמיקה');
    await page.click('#ed_wantToTryInput + button');
    await page.click('#ed_saveBtn');
    await expect(page.locator('#editOverlay')).toBeHidden({ timeout: 10000 });

    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('hobbyMatchUser')));
    expect(session.partnerTypes).toEqual(['hikes', 'גלישת גלים']);
    expect(session.wantToTry).toEqual(['קרמיקה']);
  });

  test('my hobbies are listed first; categories open on "+ הוספת תחביב"', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
    await page.evaluate(() => openEditDrawer());
    const picker = page.locator('#ed_hobbyPicker');
    await expect(picker).toContainText('ריצה');
    await expect(picker.locator('.hp-bubble')).toHaveCount(0);
    await picker.locator('button:has-text("הוספת תחביב")').click();
    await expect(picker.locator('.hp-bubble')).toHaveCount(7);
    await expect(page.locator('#ed_identity')).toContainText('test@example.com');
  });

  test('profile shows 🌱 want to try and 🤝 hobby partners', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, MOCK_SESSION);
    await page.goto('/profiles.html');
    await page.evaluate(u => showProfileModal(u, false, me), { ...MOCK_FEED_USERS[0], wantToTry: ['קרמיקה'], partnerTypes: ['hikes', 'גלישה', ''] });
    const modal = page.locator('#profileModal');
    await expect(modal).toContainText('🌱 רוצה לנסות');
    await expect(modal).toContainText('🤝 עכשיו מחפש/ת שותפים ל…');
    await expect(modal).toContainText('🥾 טיולים והליכות');
    await expect(modal).toContainText('🤝 גלישה');
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

test.describe('Photos — one public gallery', () => {
  const PHOTO_USER = {
    fullName: 'רוני אבן', email: 'roni@example.com', age: 33, city: 'תל אביב', hobby: 'ריצה', hobbies: ['ריצה'],
    profilePhotoURL: 'https://example.com/me.jpg', hobbyImages: ['https://example.com/run.jpg'],
    latitude: 32.0853, longitude: 34.7818,
  };

  test('profile photo is shown to everyone (avatar + first in the carousel)', async ({ page }) => {
    await setupFirebaseMock(page, { users: [PHOTO_USER] });
    await injectSession(page, MOCK_SESSION);           // not matched with רוני
    await page.addInitScript(e => localStorage.setItem('hobbyMatchTourDone_' + e, '1'), MOCK_SESSION.email);
    await page.goto('/profiles.html');
    await page.click('#tabDiscover');
    const card = page.locator('#feedGrid [data-email="roni@example.com"]');
    await expect(card.locator('img[src="https://example.com/me.jpg"]').first()).toBeAttached({ timeout: 15000 });
    const slides = card.locator('[data-slides] img');
    await expect(slides).toHaveCount(2);
    await expect(slides.first()).toHaveAttribute('src', 'https://example.com/me.jpg');
  });

  test('edit drawer: one gallery, older profile photo first and marked "ראשית"', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await injectSession(page, { ...MOCK_SESSION, profilePhotoURL: 'https://example.com/me.jpg', hobbyImages: ['https://example.com/run.jpg'] });
    await page.goto('/profiles.html');
    await page.evaluate(() => openEditDrawer());
    const gallery = page.locator('#ed_gallery');
    await expect(gallery.locator('img')).toHaveCount(2);
    await expect(gallery.locator('img').first()).toHaveAttribute('src', 'https://example.com/me.jpg');
    await expect(gallery).toContainText('ראשית');
    await expect(page.locator('#editDrawer')).not.toContainText('רק מי שיש איתו קונקשן רואה</p>');
    await page.click('#ed_saveBtn');
    await expect(page.locator('#editOverlay')).toBeHidden({ timeout: 10000 });
    const s = await page.evaluate(() => JSON.parse(localStorage.getItem('hobbyMatchUser')));
    expect(s.hobbyImages).toEqual(['https://example.com/me.jpg', 'https://example.com/run.jpg']);
    expect(s.profilePhotoURL).toBe('https://example.com/me.jpg');
  });
});
