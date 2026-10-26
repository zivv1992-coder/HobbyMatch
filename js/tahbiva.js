// ══════════════════════════════════════════════════════════════════════════════
// tahbiva.js — Sign-up onboarding with Tahbiva 🦉 (runs before auth)
// Builds a profile draft in localStorage (TAHBIVA_DRAFT_KEY); register.html picks
// it up after email/Google sign-in and saves it. Data: HOBBY_CATEGORIES,
// HOBBY_EMOJI, TAHBIVA, CITIES (config.js).
// ══════════════════════════════════════════════════════════════════════════════

const MAX_HOBBIES  = HOBBY_PICKER_MAX;           // same cap as the hobby picker
const NEAR_KM      = 50;                         // "לידך" radius
const QUICK_CITIES = ['פרדס חנה-כרכור', 'תל אביב', 'חיפה', 'ירושלים', 'באר שבע', 'נתניה'];
const SAY          = { love: ['ידעתי! 💚', 'איזה טעם טוב 😎', 'נוסף לפרופיל 💚'], try: ['רשמתי — אולי ננסה ביחד 🤔', 'שווה ניסיון! 🤔'] };
const DOTS         = ['hi', 'tot', 'interests', 'details', 'where', 'nearby', 'discover', 'profile', 'looking', 'about', 'ready'];
const ABOUT = [
  { k: 'bio',   e: '✍️', q: 'ספר/י קצת על עצמך', area: true,
    ph: 'למשל: אוהב/ת לטייל בטבע ולצייר בצבעי מים. בא לי להכיר שותף/ה לציור 🎨' },
  { k: 'age',   e: '🎂', q: 'בן/בת כמה את/ה?', in: 'type="number" inputmode="numeric" min="18" max="99" placeholder="גיל"' },
  { k: 'phone', e: '📱', q: 'ומה המספר שלך?', in: 'type="tel" inputmode="tel" dir="ltr" maxlength="13" placeholder="050-0000000"',
    note: '🔒 לא מוצג בפרופיל. רק מי שיש איתו קונקשן רואה' },
];

// Hobby name → { e, n, w (category id | 'surprise' | 'custom'), d (humor line) }
const H = {};
HOBBY_CATEGORIES.forEach(c => c.items.forEach(n => H[n] = { e: HOBBY_EMOJI[n] || '⭐', n, w: c.id, d: TAHBIVA.LINES[n] || '' }));
TAHBIVA.SURPRISE.forEach(([e, n, d]) => H[n] = { e, n, d, w: 'surprise' });
const hob = n => H[n] || { e: '⭐', n, d: '', w: 'custom' };
const catById = id => HOBBY_CATEGORIES.find(c => c.id === id);

// ═══ State (draft) ═══════════════════════════════════════════════════════════
const fresh = () => ({ screen: 'hi', hist: [], tot: [], status: {}, cats: [], seeded: false, dTab: 0,
                       disc: null, discIdx: 0, looking: [], aboutStep: 0, bio: '', age: '', city: '', phone: '' });
let S;
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(TAHBIVA_DRAFT_KEY)) || {}); } catch (_) { S = fresh(); }
function save() { try { localStorage.setItem(TAHBIVA_DRAFT_KEY, JSON.stringify(S)); } catch (_) {} }

const $   = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const positives = () => Object.keys(S.status).filter(n => S.status[n] === 'love');
// "חושב/ת לנסות" — only from the discover cards; its own card in the profile
const tries = () => Object.keys(S.status).filter(n => S.status[n] === 'try');
const isOn = n => S.status[n] === 'love';
// Adds a hobby unless the profile is full; returns false when it couldn't
function addLove(n) {
  if (isOn(n)) return true;
  if (positives().length >= MAX_HOBBIES) { toast(`אפשר עד ${MAX_HOBBIES} תחביבים 🙂`); return false; }
  S.status[n] = 'love';
  return true;
}

let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function say(id, text) { const el = $(id); el.style.opacity = 0; setTimeout(() => { el.textContent = text; el.style.opacity = 1; }, 150); }

// ═══ Navigation ═════════════════════════════════════════════════════════════
const RENDER = { tot: renderTot, interests: renderInterests, details: renderDetails, where: renderWhere, nearby: renderNearby,
                 discover: renderDiscover, profile: renderProfile, looking: renderLooking, about: renderAbout, ready: renderReady };

function show(id, dir) {
  const from = document.querySelector('.screen.active'), to = $(id);
  if (from === to) return;
  // RTL: moving forward, the new screen slides in from the left
  to.style.transition = 'none';
  to.style.transform = dir ? `translateX(${dir > 0 ? -40 : 40}px)` : '';
  to.offsetWidth;
  to.style.transition = '';
  to.classList.add('active');
  to.style.transform = '';
  to.scrollTop = 0;
  if (from) {
    from.classList.remove('active');
    if (dir) from.style.transform = `translateX(${dir > 0 ? 40 : -40}px)`;
  }
}

function go(id) {
  if (S.screen !== id) S.hist.push(S.screen);
  S.screen = id;
  (RENDER[id] || (() => {}))();
  show(id, 1);
  chrome(); save();
}

function back() {
  // Inside multi-step screens, "back" first undoes the last step
  if (S.screen === 'tot' && S.tot.length) { S.tot.pop(); renderTot(); save(); return; }
  if (S.screen === 'details' && S.dTab > 0) { S.dTab--; renderDetails(); save(); return; }
  if (S.screen === 'discover' && S.discIdx > 0) { undoDisc(); return; }
  if (S.screen === 'about' && S.aboutStep > 0) { S.aboutStep--; renderAbout(); save(); return; }
  const prev = S.hist.pop();
  if (!prev) { window.location.href = 'index.html'; return; }
  // Re-open the last round/card instead of bouncing straight forward again
  if (prev === 'tot' && S.tot.length >= TAHBIVA.TOT.length) S.tot.pop();
  if (prev === 'about') S.aboutStep = Math.min(S.aboutStep, ABOUT.length - 1);
  if (prev === 'discover' && S.disc && S.discIdx >= S.disc.length) { S.discIdx--; delete S.status[S.disc[S.discIdx]]; }
  S.screen = prev;
  (RENDER[prev] || (() => {}))();
  show(prev, -1);
  chrome(); save();
}

function chrome() {
  const i = DOTS.indexOf(S.screen);
  $('dots').innerHTML = i < 0 ? '' : DOTS.map((_, k) => `<span class="dot ${k === i ? 'on' : ''}"></span>`).join('');
}

// ═══ This or that — answers pre-mark matching hobbies ═══════════════════════
let totLock = false;
function startTot() { S.tot = []; go('tot'); }
function renderTot() {
  const r = S.tot.length;
  if (r >= TAHBIVA.TOT.length) { go('interests'); return; }
  if (r === 0) $('totSay').textContent = 'זה או זה? בלי לחשוב יותר מדי 😉';
  const opt = (o, k) => `<button class="tile w-full p-6 text-center" onclick="pickTot(${k}, this)">
      <div class="text-5xl mb-2">${o.e}</div><div class="text-xl font-black">${o.label}</div></button>`;
  const [a, b] = TAHBIVA.TOT[r];
  $('totBox').innerHTML = `<div class="pop flex flex-col gap-3">
      <div class="text-center text-sm font-bold text-[#a59bc7]">${r + 1} / ${TAHBIVA.TOT.length}</div>
      ${opt(a, 0)}<div class="text-center font-black text-[#c4b5fd]">או</div>${opt(b, 1)}</div>`;
}
function pickTot(k, el) {
  if (totLock) return;
  totLock = true;
  el.classList.add('on');
  S.tot.push(k);
  say('totSay', TAHBIVA.TOT[S.tot.length - 1][k].reply);
  save();
  setTimeout(() => {
    totLock = false;
    if (S.tot.length < TAHBIVA.TOT.length) return renderTot();
    seedFromTot();
    go('interests');
  }, 900);
}
function seedFromTot() {
  S.tot.forEach((k, i) => TAHBIVA.TOT[i][k].seed.forEach(n => {
    addLove(n);
    if (!S.cats.includes(H[n].w)) S.cats.push(H[n].w);
  }));
  S.seeded = true;
  save();
}
// Category ids the answers lean to, strongest first
function worldWeights() {
  const w = {};
  S.tot.forEach((k, i) => TAHBIVA.TOT[i][k].cats.forEach(id => w[id] = (w[id] || 0) + 1));
  return Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 3);
}

// ═══ Step 1: broad categories ═══════════════════════════════════════════════
const catOrder = () => { const top = worldWeights(); return [...top.map(catById), ...HOBBY_CATEGORIES.filter(c => !top.includes(c.id))]; };
function renderInterests() {
  $('intSay').textContent = S.seeded ? 'סימנתי לפי מה שבחרת ✨ אפשר לשנות' : 'מה מעניין אותך? אפשר לבחור כמה 🎯';
  $('catGrid').innerHTML = catOrder().map((c, i) => {
    const on = S.cats.includes(c.id);
    return `<div style="animation:pop .35s ease ${i * 30}ms backwards">
      <button class="cat-card ${on ? 'on' : ''}" onclick="toggleCat('${c.id}', this)">
        <span class="text-3xl">${c.emoji}</span><span class="font-black text-lg flex-1">${c.label}</span><span class="mark">${on ? '✓' : '+'}</span></button></div>`;
  }).join('');
  $('interestsNext').style.opacity = S.cats.length ? 1 : .45;
}
function toggleCat(id, el) {
  const on = S.cats.includes(id);
  S.cats = on ? S.cats.filter(x => x !== id) : [...S.cats, id];
  // Un-picking a category drops the hobbies marked in it
  if (on) catById(id).items.forEach(n => delete S.status[n]);
  el.classList.toggle('on', !on);
  el.querySelector('.mark').textContent = on ? '+' : '✓';
  $('interestsNext').style.opacity = S.cats.length ? 1 : .45;
  save();
}
function interestsNext() {
  if (!S.cats.length) return toast('בחר/י לפחות תחום אחד 🙂');
  S.dTab = 0;
  go('details');
}

// ═══ Step 2: one category at a time, big tiles, tap = 💚 ════════════════════
const chosenCats = () => catOrder().filter(c => S.cats.includes(c.id));
function renderDetails() {
  const cats = chosenCats();
  if (!cats.length) return;
  S.dTab = Math.min(S.dTab, cats.length - 1);
  const c = cats[S.dTab], last = S.dTab === cats.length - 1;
  $('dProgress').textContent = `קטגוריה ${S.dTab + 1} מתוך ${cats.length}`;
  $('dCard').innerHTML = `<div class="pop">
      <div class="flex items-center justify-center gap-2 mb-4"><span class="text-3xl">${c.emoji}</span><h3 class="font-black text-xl">${c.label}</h3></div>
      <div class="grid grid-cols-2 gap-3">${c.items.map((n, i) =>
        `<button class="tile p-5 text-center ${isOn(n) ? 'on' : ''}" onclick="toggleHobby('${c.id}', ${i}, this)">
           <span class="ok">✓</span><div class="text-5xl mb-2">${hob(n).e}</div><div class="font-black leading-tight">${n}</div></button>`).join('')}</div></div>`;
  $('dPrev').style.visibility = S.dTab ? 'visible' : 'hidden';
  $('dNext').textContent = last ? 'סיום והצגת מאצ׳ים ←' : 'הבא ←';
}
function toggleHobby(cid, i, el) {
  const n = catById(cid).items[i];
  if (isOn(n)) delete S.status[n];
  else if (!addLove(n)) return;
  el.classList.toggle('on', isOn(n));
  save();
}
function changeCats() { S.dTab = 0; back(); }
function detailsNext() {
  if (S.dTab < chosenCats().length - 1) { S.dTab++; renderDetails(); $('details').scrollTop = 0; save(); return; }
  if (!positives().length) return toast('סמנ/י לפחות תחביב אחד 🙂');
  go('where');
}

// ═══ Where — city from CITIES (needed for distance) ═════════════════════════
let cityPicker = null;
function renderWhere() {
  if (!cityPicker) {
    cityPicker = createCityPicker('whereCity', 'field');
    $('whereCity').nextElementSibling.style.width = '100%';   // picker wrapper → full width
  }
  cityPicker.setCity(S.city);
  $('whereChips').innerHTML = QUICK_CITIES.filter(c => CITIES.some(x => x.name === c)).map(c =>
    `<button type="button" class="pill ${S.city === c ? 'on' : ''}" onclick="pickCity('${c}')">${c}</button>`).join('');
}
function pickCity(c) { cityPicker.setCity(c); whereNext(); }
function whereNext() {
  const v = $('whereCity').value;
  if (!v) return toast('בחר/י עיר מהרשימה 🙂');
  S.city = v;
  go('nearby');
}

// ═══ Nearby — real people with shared hobbies + one upcoming activity ══════
let usersCache = null;
async function findNearby() {
  const here = CITIES.find(c => c.name === S.city);
  if (!usersCache) usersCache = await fetchAllUsers();
  const mine = positives();
  return usersCache
    .filter(u => u.latitude != null && u.longitude != null)
    .map(u => {
      const shared = getUserHobbies(u).filter(h => mine.includes(h));
      return { u, shared, km: distanceKm(here.lat, here.lng, u.latitude, u.longitude) };
    })
    .filter(x => x.shared.length && x.km <= NEAR_KM)
    .sort((a, b) => b.shared.length - a.shared.length || a.km - b.km)
    .slice(0, 3);
}
async function findActivity() {
  const snap = await db.collection('events')
    .where('dateTime', '>=', firebase.firestore.Timestamp.now())
    .orderBy('dateTime').limit(40).get();
  const mine = positives();
  // Same loose matching as the events tab (eventMatchesUser in profiles-events.js)
  return snap.docs.map(d => d.data()).find(ev => {
    const tags = (ev.associatedHobbies && ev.associatedHobbies.length ? ev.associatedHobbies : [ev.hobby || '']).map(stripEmoji).filter(Boolean);
    return mine.some(k => tags.some(t => t.includes(k) || k.includes(t)));
  }) || null;
}
function personCard({ u, shared, km }) {
  const name = displayName(u.fullName);
  return `<div class="tile p-4 mb-2"><div class="flex items-center gap-3 mb-2">
      <div class="w-11 h-11 rounded-full bg-[#f3efff] grid place-items-center font-black text-[#7c3aed]">${esc(getInitials(name))}</div>
      <div class="flex-1"><div class="font-bold">${esc(name)}${u.age ? `, ${esc(u.age)}` : ''}</div>
        <div class="text-xs text-[#8b7fb0]">📍 ${km < 1 ? 'ממש לידך' : `${Math.round(km)} ק״מ ממך`}</div></div></div>
    <div class="mb-2">${shared.slice(0, 3).map(n => `<span class="chip" style="padding-left:12px">${hob(n).e} ${esc(n)}</span>`).join('')}</div>
    <button class="ice" onclick="toast('אפשר לשלוח הודעה מיד אחרי ההרשמה 💌')">💬 שלח הודעה</button></div>`;
}
async function renderNearby() {
  $('nearSay').textContent = `מחפשת לך אנשים ליד ${S.city}… 👀`;
  $('nearBox').innerHTML = `<div class="tile p-4 mb-4"><div class="font-black text-sm text-[#7c3aed] mb-1">התחביבים שסימנת</div>
      ${positives().map(n => `<span class="chip" style="padding-left:12px">${hob(n).e} ${esc(n)}</span>`).join('')}</div>
    <div id="nearList" class="text-center text-[#a59bc7] font-semibold py-6">⏳</div>`;
  const [people, act] = await Promise.all([
    findNearby().catch(err => { console.error('nearby users:', err); return null; }),
    findActivity().catch(err => { console.error('nearby activity:', err); return null; }),
  ]);
  if (S.screen !== 'nearby') return;
  if (people === null) {
    $('nearSay').textContent = 'לא הצלחתי לטעון כרגע 😕';
    $('nearList').textContent = 'שגיאה בטעינת אנשים מהאזור. אפשר להמשיך בכל זאת.';
    return;
  }
  say('nearSay', people.length
    ? `${people.length === 1 ? 'מצאתי מישהו' : `מצאתי ${people.length} אנשים`} ליד ${S.city} שאוהבים מה שאת/ה אוהב/ת 👀`
    : `עוד אין פה מישהו עם אותם תחביבים ליד ${S.city} — את/ה תהיה/י מהראשונים 🌱`);
  $('nearList').outerHTML = `<div class="text-right">${people.map(personCard).join('')}
    ${act ? `<div class="font-black mt-4 mb-2">📅 פעילות שאולי תתאים</div>
      <div class="tile p-3 flex items-center gap-3">
        <div class="text-3xl w-12 h-12 rounded-2xl bg-[#f3efff] grid place-items-center">📅</div>
        <div class="flex-1 min-w-0"><div class="font-bold truncate">${esc(act.title || '')}</div>
          <div class="text-xs text-[#8b7fb0]">${esc(formatEventDate(act.dateTime))}${act.location ? ` · ${esc(act.location)}` : ''}</div></div></div>` : ''}</div>`;
}
function toDiscover() { S.disc = null; go('discover'); }

// ═══ Discover: 4 new hobbies (the 4th is Tahbiva's surprise) ═══════════════
function buildDisc() {
  const liked = HOBBY_CATEGORIES.filter(c => c.items.some(isOn)).map(c => c.id);
  const pref = [...new Set([...S.cats, ...worldWeights(), ...liked])];
  const pool = Object.keys(TAHBIVA.LINES).filter(n => !(n in S.status));
  const picks = [];
  for (const w of pref) {
    const cand = pool.filter(n => H[n].w === w && !picks.includes(n));
    if (cand.length) picks.push(rnd(cand));
    if (picks.length === 3) break;
  }
  while (picks.length < 3) {
    const rest = pool.filter(n => !picks.includes(n));
    if (!rest.length) break;
    picks.push(rnd(rest));
  }
  const s = pickSurprise([]);
  S.disc = s ? [...picks, s] : picks;
  S.discIdx = 0;
}
function pickSurprise(exclude) {
  const pool = TAHBIVA.SURPRISE.map(s => s[1]).filter(n => !(n in S.status) && !exclude.includes(n));
  return pool.length ? rnd(pool) : null;
}
let cardLock = false;
function renderDiscover() {
  if (!S.disc) buildDisc();
  const i = S.discIdx, total = S.disc.length;
  if (i >= total) { go('profile'); return; }
  const h = hob(S.disc[i]), isSurprise = h.w === 'surprise';
  $('discSay').textContent = isSurprise ? 'רגע, יש לי רעיון מפתיע בשבילך… 🤭' : i === 0 ? 'כמה רעיונות שאולי לא חשבת עליהם' : $('discSay').textContent;
  const card = `<div class="text-center text-sm font-bold text-[#a59bc7] mb-2">${i + 1} / ${total}</div>
    <div id="hcard" class="hcard pop ${isSurprise ? 'ring-4 ring-amber-200' : ''}">
      ${isSurprise ? '<div class="tag inline-block mb-3">🎁 תחביבה מפתיעה</div>' : ''}
      <div class="text-7xl mb-3">${h.e}</div>
      <h3 class="text-2xl font-black">${esc(h.n)}</h3>
      <p class="text-[#7c6aa8] font-semibold mt-1">${esc(h.d)}</p></div>`;
  const buttons = `<div class="grid grid-cols-3 gap-2 mt-5">
      <button class="st" style="background:#dcfce7" onclick="rateDisc('love')">💚 מעניין אותי</button>
      <button class="st" style="background:#fef3c7" onclick="rateDisc('try')">🤔 חושב/ת לנסות</button>
      <button class="st" style="background:#f3efff" onclick="rateDisc(null)">🙅 לא</button></div>
    ${isSurprise ? `<button class="link block mx-auto" onclick="surpriseAgain()">🎁 תפתיעי שוב</button>` : ''}`;
  $('discSlot').innerHTML = card + buttons;
}
function rateDisc(st) {
  if (cardLock) return;
  const name = S.disc[S.discIdx];
  if (st === 'love' && !addLove(name)) return;
  if (st === 'try') S.status[name] = 'try';
  cardLock = true;
  $('hcard').classList.add(st ? 'fly-love' : 'fly-skip');
  setTimeout(() => {
    S.discIdx++;
    if (st) say('discSay', rnd(SAY[st]));
    cardLock = false;
    save();
    S.discIdx >= S.disc.length ? setTimeout(() => go('profile'), 400) : renderDiscover();
  }, 260);
}
function undoDisc() {
  S.discIdx--;
  delete S.status[S.disc[S.discIdx]];
  say('discSay', 'חוזרים אחורה ↩️');
  renderDiscover(); save();
}
function surpriseAgain() {
  const next = pickSurprise([S.disc[S.discIdx]]);
  if (!next) return toast('נגמרו לי ההפתעות 😅');
  S.disc[S.discIdx] = next;
  renderDiscover(); save();
}
function discoverMore() { S.disc = null; go('discover'); }

// ═══ My hobbies (✕ to remove, + to add) ═════════════════════════════════════
let chipNames = [];
function renderProfile() {
  const pos = positives();
  const byCat = {};
  pos.forEach(n => { const w = hob(n).w; byCat[w] = (byCat[w] || 0) + 1; });
  const vibes = Object.keys(byCat).filter(catById).sort((a, b) => byCat[b] - byCat[a]).slice(0, 2).map(id => catById(id).vibe);
  $('profileSay').textContent = !pos.length ? 'עוד ריק פה. גם זו התחלה 🙂'
    : vibes.length === 2 ? `נראה שאת/ה בקטע של ${vibes[0]} ו${vibes[1]} ✨`
    : vibes.length ? `נראה שאת/ה בקטע של ${vibes[0]} ✨` : 'פרופיל מקורי! ✨';
  const tr = tries();
  chipNames = [...pos, ...tr];
  const chip = (n, i) => `<span class="chip">${hob(n).e} ${esc(n)}<button class="x" onclick="removeHobby(${i}, this)" aria-label="הסרה">✕</button></span>`;
  $('profileBox').innerHTML = `<div class="tile p-4 mb-3"><div class="font-black mb-2">💚 התחביבים שלי</div>
      ${pos.length ? pos.map(chip).join('') : '<p class="text-sm text-[#a59bc7]">עוד אין</p>'}</div>
    ${tr.length ? `<div class="tile p-4 mb-3"><div class="font-black mb-2">🤔 חושב/ת לנסות</div>
      ${tr.map((n, i) => chip(n, pos.length + i)).join('')}</div>` : ''}
    <form onsubmit="addCustom(event)" class="flex gap-2 mt-1">
      <input id="profileAdd" class="pill flex-1 outline-none" maxlength="${HOBBY_PICKER_MAX_LEN}" placeholder="+ הוסף תחביב">
      <button class="pill" style="background:var(--p);color:#fff">הוסף</button></form>`;
}
function removeHobby(i, btn) {
  btn.parentElement.classList.add('gone');
  setTimeout(() => { delete S.status[chipNames[i]]; save(); renderProfile(); }, 200);
}
function addCustom(e) {
  e.preventDefault();
  const v = $('profileAdd').value.replace(/\s+/g, ' ').trim();
  if (!v || !addLove(v)) return;
  save();
  toast('נוסף לפרופיל 💚');
  renderProfile();
}

// ═══ Looking for / about / ready ═══════════════════════════════════════════
function renderLooking() {
  $('lookBox').innerHTML = TAHBIVA.LOOKING.map(l => `
    <button class="tile p-5 flex items-center gap-4 text-right ${S.looking.includes(l.id) ? 'on' : ''}" onclick="toggleLook('${l.id}', this)">
      <span class="text-4xl">${l.e}</span><span class="text-lg font-black">${l.label}</span></button>`).join('');
}
function toggleLook(id, el) {
  S.looking = S.looking.includes(id) ? S.looking.filter(x => x !== id) : [...S.looking, id];
  el.classList.toggle('on', S.looking.includes(id));
  save();
}
function startAbout() { S.aboutStep = 0; go('about'); }
function renderAbout() {
  const i = S.aboutStep;
  if (i >= ABOUT.length) { go('ready'); return; }
  const a = ABOUT[i];
  $('aboutSay').textContent = a.q;
  $('aboutForm').innerHTML = `<div class="pop flex flex-col items-center gap-4">
      <div class="text-sm font-bold text-[#a59bc7]">${i + 1} / ${ABOUT.length}</div>
      <div class="text-6xl">${a.e}</div>
      ${a.area
        ? `<textarea id="aboutIn" class="tile w-full p-4 text-base font-semibold outline-none resize-none focus:border-[#7c3aed]" rows="5" maxlength="300"
             placeholder="${a.ph}">${esc(S[a.k] || '')}</textarea>`
        : `<input id="aboutIn" class="field" ${a.in} value="${esc(S[a.k] || '')}">`}
      ${a.note ? `<p class="text-sm font-semibold text-[#8b7fb0]">${a.note}</p>` : ''}
    </div>
    <button class="btn btn-p mt-auto">המשך ←</button>`;
  setTimeout(() => $('aboutIn') && $('aboutIn').focus({ preventScroll: true }), 400);
}
function aboutNext(e) {
  e.preventDefault();
  const a = ABOUT[S.aboutStep];
  let v = $('aboutIn').value.trim();
  if (a.k === 'age' && !(+v >= 18 && +v <= 99)) return toast('גיל בין 18 ל-99 🙂');
  if (a.k === 'phone') {
    try { v = sanitizePhone(v); } catch (err) { return toast(err.message); }
  }
  S[a.k] = v; S.aboutStep++; save();
  renderAbout();
}
function renderReady() {
  const n = positives().length;
  $('readyText').textContent = n ? `יש ${n} תחביבים בפרופיל שלך. בוא/י נמצא אנשים שאוהבים אותם.` : 'בוא/י נמצא אנשים שאוהבים מה שאת/ה אוהב/ת.';
}
// Hand-off: register.html reads the draft after sign-in and saves the profile
function finish() {
  if (!positives().length) { toast('סמנ/י לפחות תחביב אחד 🙂'); return go('interests'); }
  if (!S.city) { toast('איפה את/ה גר/ה? 🙂'); return go('where'); }
  if (!S.age || !S.phone) { toast('חסר עוד פרט קטן 🙂'); return startAbout(); }
  S.done = true;
  save();
  trackEvent('tahbiva_done');
  window.location.href = 'register.html?mode=register&from=tahbiva'
    + (S.returnTo ? '&returnTo=' + encodeURIComponent(S.returnTo) : '');
}

// ═══ Boot ═══════════════════════════════════════════════════════════════════
redirectIfLoggedIn();
// Keep a shared-link destination (e.g. an activity) through the whole flow
const _rt = new URLSearchParams(location.search).get('returnTo');
if (_rt) { S.returnTo = _rt; save(); }
if (S.screen === 'hi' && !S.hist.length) trackEvent('tahbiva_start');
(RENDER[S.screen] || (() => {}))();
show(S.screen, 0);
chrome();
