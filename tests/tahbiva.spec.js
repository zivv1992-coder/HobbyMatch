const { test, expect } = require('@playwright/test');
const { setupFirebaseMock, MOCK_FEED_USERS } = require('./helpers');

// A finished Tahbiva draft, as tahbiva.html leaves it before sign-in
const DONE_DRAFT = {
  screen: 'ready', hist: [], tot: [1, 0, 1], status: { 'ריצה': 'love', 'יוגה': 'love', 'שחמט': 'love', 'קרמיקה': 'try', 'אפייה': 'no' },
  cats: ['move', 'games'], looking: ['friends', 'romantic'], partners: ['dance', 'coffee'],
  bio: 'אוהב/ת לרוץ בבוקר', age: '29', city: 'תל אביב', phone: '0501234567', done: true,
};

// Planted once per test — later page loads must see what the app left behind
async function setDraft(page, draft) {
  await page.addInitScript(d => {
    if (sessionStorage.getItem('draftPlanted')) return;
    sessionStorage.setItem('draftPlanted', '1');
    localStorage.setItem('tahbivaDraft2', JSON.stringify(d));
  }, draft);
}

test.describe('Tahbiva onboarding (tahbiva.html)', () => {

  test('full flow: this-or-that marks nothing, partners saved, nearby shows real users with shared hobbies', async ({ page }) => {
    await setupFirebaseMock(page, { users: MOCK_FEED_USERS });
    await page.goto('/tahbiva.html');
    await expect(page.locator('#hi')).toHaveClass(/active/);
    await page.click('#hi button:has-text("יאללה")');

    // 3 rounds, each with its own question
    await expect(page.locator('#totBox')).toContainText('לאן הכי מושך אותך לצאת?');
    for (let r = 0; r < 3; r++) {
      await page.locator('#totBox button.tile').first().click();
      await page.waitForTimeout(1300);
    }
    await expect(page.locator('#interests')).toHaveClass(/active/, { timeout: 5000 });
    let d = await page.evaluate(() => JSON.parse(localStorage.getItem('tahbivaDraft2')));
    expect(d.tot).toEqual([0, 0, 0]);
    expect(Object.keys(d.status)).toHaveLength(0);   // answers never add hobbies
    expect(d.cats).toHaveLength(0);                  // …or pick categories
    await expect(page.locator('#catGrid .cat-card')).toHaveCount(7);

    await page.click('#catGrid .cat-card:has-text("תנועה וספורט")');
    await page.click('#interestsNext');
    await expect(page.locator('#details')).toHaveClass(/active/);
    await page.click('#dCard .tile:has-text("ריצה")');
    await expect(page.locator('#dNext')).toHaveText('סיום ←');
    await page.click('#dNext');

    await expect(page.locator('#looking')).toHaveClass(/active/);
    await page.click('#looking button.btn-p');
    await expect(page.locator('#partners')).toHaveClass(/active/);
    await page.click('#partnerBox .tile:has-text("שותפים לריקוד ולתנועה")');
    await page.click('#partners button.btn-p');

    // Discover: one card, "לא בשבילי" → my hobbies
    await expect(page.locator('#discover')).toHaveClass(/active/);
    await page.click('#discSlot button:has-text("לא בשבילי")');
    await expect(page.locator('#profile')).toHaveClass(/active/, { timeout: 5000 });
    await expect(page.locator('#profileBox')).toContainText('שותפים לריקוד ולתנועה');
    await page.click('#profile button.btn-p');

    await expect(page.locator('#where')).toHaveClass(/active/);
    await page.click('#whereChips button:has-text("תל אביב")');

    // דנה כהן (תל אביב, ריצה) is near and shares a hobby; יובל (גיטרה) does not
    await expect(page.locator('#nearby')).toHaveClass(/active/);
    await expect(page.locator('#nearBox')).toContainText('דנה כ', { timeout: 10000 });
    await expect(page.locator('#nearBox')).not.toContainText('יובל');
    await expect(page.locator('#nearBox')).not.toContainText('דנה כהן');   // shortened name only

    d = await page.evaluate(() => JSON.parse(localStorage.getItem('tahbivaDraft2')));
    expect(d.status['ריצה']).toBe('love');
    expect(Object.values(d.status).filter(s => s === 'no').length).toBeGreaterThan(0);
    expect(d.partners).toEqual(['dance']);
    expect(d.city).toBe('תל אביב');
  });

  test('phone is required', async ({ page }) => {
    await setupFirebaseMock(page);
    await setDraft(page, { screen: 'about', hist: ['nearby'], aboutStep: 2, status: { 'ריצה': 'love' }, cats: ['move'], city: 'תל אביב', age: '30' });
    await page.goto('/tahbiva.html');
    await expect(page.locator('#aboutSay')).toHaveText('איך אפשר ליצור איתך קשר?');
    await expect(page.locator('#aboutForm')).toContainText('המספר יופיע רק למי שיש לך קונקשן איתו');
    await expect(page.locator('#aboutForm')).not.toContainText('אדלג');
    await page.click('#aboutForm button.btn-p');
    await expect(page.locator('#toast')).toHaveText('מה המספר שלך? 🙂');
    await page.fill('#aboutIn', '050-1234567');
    await page.click('#aboutForm button.btn-p');
    await expect(page.locator('#ready')).toHaveClass(/active/);
    await page.click('#ready button.btn-p');
    await expect(page).toHaveURL(/register.html/);
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
    expect(session.partnerTypes).toEqual(['dance', 'coffee']);
    expect(session.notForMe).toEqual(['אפייה']);
    expect(session.totAnswers).toEqual([1, 0, 1]);
    expect(session.romantic).toBe(true);
    expect(session.hobbyDescription).toBe('אוהב/ת לרוץ בבוקר');
    expect(session.latitude).not.toBeNull();
    expect(await page.evaluate(() => localStorage.getItem('tahbivaDraft2'))).toBeNull();
  });


  test('discover: one real hobby card · 💚 מעניין אותי · 🤔 רוצה לנסות · 🙅 לא בשבילי', async ({ page }) => {
    await setupFirebaseMock(page);
    await setDraft(page, { screen: 'discover', hist: ['partners'], tot: [], status: { 'ריצה': 'love' }, cats: ['move'], disc: null, discIdx: 0 });
    await page.goto('/tahbiva.html');
    const slot = page.locator('#discSlot');
    await expect(slot.locator('.hcard')).toHaveCount(1);
    await expect(slot.locator('button.st')).toHaveText(['💚 מעניין אותי', '🤔 רוצה לנסות', '🙅 לא בשבילי']);
    await slot.locator('button:has-text("רוצה לנסות")').click();
    await expect(page.locator('#profile')).toHaveClass(/active/, { timeout: 5000 });
    const d = await page.evaluate(() => JSON.parse(localStorage.getItem('tahbivaDraft2')));
    expect(d.disc).toHaveLength(1);
    expect(d.status[d.disc[0]]).toBe('try');
    // A real hobby from the category lists, from the chosen area
    const move = await page.evaluate(() => HOBBY_CATEGORIES.find(c => c.id === 'move').items);
    expect(move).toContain(d.disc[0]);
    await expect(page.locator('#profileBox')).toContainText(d.disc[0]);
  });

});
