const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, MOCK_FEED_USERS } = require('./helpers');

// A finished Tahbiva draft, as tahbiva.html leaves it before sign-in
const DONE_DRAFT = {
  screen: 'ready', hist: [], tot: [1, 0, 0, 1], status: { 'ריצה': 'love', 'יוגה': 'love', 'שחמט': 'love', 'קרמיקה': 'try' },
  cats: ['move', 'games'], seeded: true, looking: ['friends', 'romantic'],
  bio: 'אוהב/ת לרוץ בבוקר', age: '29', city: 'תל אביב', phone: '0501234567', done: true,
};

// Planted once per test — later page loads must see what the app left behind
async function setDraft(page, draft) {
  await page.addInitScript(d => {
    if (sessionStorage.getItem('draftPlanted')) return;
    sessionStorage.setItem('draftPlanted', '1');
    localStorage.setItem('tahbivaDraft', JSON.stringify(d));
  }, draft);
}

test.describe('Tahbiva onboarding (tahbiva.html)', () => {

  test('this-or-that pre-marks hobbies and nearby shows real users with shared hobbies', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await page.goto('/tahbiva.html');
    await expect(page.locator('#hi')).toHaveClass(/active/);
    await page.click('#hi button:has-text("יאללה")');

    // Round 1 → ☀️ זריחה (pre-marks ריצה), then the first option in the other rounds
    for (const pick of [1, 0, 0, 0]) {
      await page.locator('#totBox button.tile').nth(pick).click();
      await page.waitForTimeout(1000);
    }
    await expect(page.locator('#interests')).toHaveClass(/active/);
    await expect(page.locator('#intSay')).toContainText('סימנתי');
    await page.click('#interestsNext');

    // Step 2: ריצה is already marked; walk through the chosen categories
    await expect(page.locator('#details')).toHaveClass(/active/);
    for (let i = 0; i < 8 && !(await page.locator('#where').evaluate(el => el.classList.contains('active'))); i++) {
      await page.click('#dNext');
      await page.waitForTimeout(450);
    }
    await expect(page.locator('#where')).toHaveClass(/active/);
    await page.click('#whereChips button:has-text("תל אביב")');

    // דנה כהן (תל אביב, ריצה) is near and shares a hobby; יובל (גיטרה) does not
    await expect(page.locator('#nearby')).toHaveClass(/active/);
    await expect(page.locator('#nearbox, #nearBox')).toContainText('דנה כ', { timeout: 10000 });
    await expect(page.locator('#nearBox')).not.toContainText('יובל');
    await expect(page.locator('#nearBox')).not.toContainText('דנה כהן');   // shortened name only

    const draft = await page.evaluate(() => JSON.parse(localStorage.getItem('tahbivaDraft')));
    expect(draft.status['ריצה']).toBe('love');
    expect(draft.city).toBe('תל אביב');
  });

  test('register.html without a draft sends sign-up to Tahbiva', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/register.html?mode=register');
    await expect(page).toHaveURL(/tahbiva/);
  });

  test('login mode stays on register.html', async ({ page }) => {
    await setupFirebaseMock(page);
    await page.goto('/register.html?mode=login');
    await expect(page.locator('#emailInput')).toBeVisible();
  });

  test('after sign-in, the finish step saves the profile from the draft', async ({ page }) => {
    await setupFirebaseMock(page);
    await setDraft(page, DONE_DRAFT);
    await page.goto('/register.html?mode=register&from=tahbiva');
    await expect(page.locator('#step1')).toHaveClass(/active/);

    // Simulate a verified new user (OTP/Google are covered elsewhere)
    await page.evaluate(() => { verifiedEmail = 'new@example.com'; goToSignupFinish(); });
    await expect(page.locator('#step4')).toHaveClass(/active/);
    await expect(page.locator('#t_summary')).toContainText('3 תחביבים');

    // Consent is required
    await page.fill('#t_name', 'נועה לוי');
    await page.click('#t_laterBtn');
    await expect(page.locator('#step4Error')).not.toHaveClass(/hidden/);

    await page.check('#t_consent');
    await page.click('#t_laterBtn');
    await expect(page).toHaveURL(/\/profiles/, { timeout: 10000 });

    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('hobbyMatchUser')));
    expect(session.fullName).toBe('נועה לוי');
    expect(session.hobbies).toEqual(['ריצה', 'יוגה', 'שחמט']);
    expect(session.hobby).toBe('ריצה, יוגה, שחמט');
    expect(session.wantToTry).toEqual(['קרמיקה']);
    expect(session.lookingFor).toEqual(['friends', 'romantic']);
    expect(session.romantic).toBe(true);
    expect(session.hobbyDescription).toBe('אוהב/ת לרוץ בבוקר');
    expect(session.latitude).not.toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('tahbivaDraft'))).toBeNull();
  });


  test('discover cards: 💚 מעניין אותי · 🤔 חושב/ת לנסות · 🙅 לא', async ({ page }) => {
    await setupFirebaseMock(page);
    await setDraft(page, { screen: 'discover', hist: ['profile'], tot: [], status: { 'ריצה': 'love' }, cats: ['move'], disc: null, discIdx: 0 });
    await page.goto('/tahbiva.html');
    const slot = page.locator('#discSlot');
    await expect(slot.locator('button.st')).toHaveText(['💚 מעניין אותי', '🤔 חושב/ת לנסות', '🙅 לא']);
    await slot.locator('button:has-text("חושב/ת לנסות")').click();
    await page.waitForTimeout(500);
    await slot.locator('button:has-text("🙅 לא")').click();
    await page.waitForTimeout(500);
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem('tahbivaDraft')));
    expect(Object.values(d.status).filter(s => s === 'try')).toHaveLength(1);
    expect(Object.keys(d.status)).toHaveLength(2);   // "לא" leaves nothing behind
  });

});
