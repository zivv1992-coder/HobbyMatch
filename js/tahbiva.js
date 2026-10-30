// ══════════════════════════════════════════════════════════════════════════════
// tahbiva.js — Sign-up onboarding with Tahbiva 🦉 (runs before auth)
// Builds a profile draft in localStorage (TAHBIVA_DRAFT_KEY); register.html picks
// it up after email/Google sign-in and saves it. Data: HOBBY_CATEGORIES,
// HOBBY_EMOJI, TAHBIVA, CITIES (config.js).
// Principle: Tahbiva suggests, the user chooses. "This or that" only reorders.
// ══════════════════════════════════════════════════════════════════════════════

const MAX_HOBBIES  = HOBBY_PICKER_MAX;           // same cap as the hobby picker
const NEAR_KM      = 50;                         // "לידך" radius
const QUICK_CITIES = ['פרדס חנה-כרכור', 'תל אביב', 'חיפה', 'ירושלים', 'באר שבע'];   // until real counts load
const SAY = {
  love: ['ידעתי! 💚', 'איזה טעם טוב 😎', 'נוסף לפרופיל 💚'],
  try:  ['רעיון טוב! אולי הגיע הזמן לנסות 🤔', 'שווה ניסיון!'],
  no:   ['הבנתי, נמשיך לחפש 😊'],
};
const DOTS = ['hi', 'tot', 'interests', 'details', 'looking', 'partners', 'discover', 'profile', 'where', 'nearby', 'about', 'ready'];
const ABOUT = [
  { k: 'bio',   e: '✍️', q: 'ספר/י קצת על עצמך', area: true,
    ph: 'למשל: אוהב/ת לטייל בטבע ולצייר בצבעי מים. בא לי להכיר שותף/ה לציור 🎨' },
  { k: 'age',   e: '🎂', q: 'בן/בת כמה את/ה?', in: 'type="number" inputmode="numeric" min="18" max="99" placeholder="גיל"' },
  { k: 'phone', e: '📱', q: 'איך אפשר ליצור איתך קשר?', optional: true,
    in: 'type="tel" inputmode="tel" dir="ltr" maxlength="13" placeholder="050-0000000"',
    note: 'המספר יופיע רק למי שיש לך קונקשן איתו, ולא מופיע לכולם.' },
];

// Hobby name → { e, n, w (category id | 'custom'), d (line) }
const H = {};
HOBBY_CATEGORIES.forEach(c => c.items.forEach(n => H[n] = { e: HOBBY_EMOJI[n] || '⭐', n, w: c.id, d: TAHBIVA.LINES[n] || '' }));
const hob = n => H[n] || { e: HOBBY_EMOJI[n] || '⭐', n, d: '', w: 'custom' };
const catById = id => HOBBY_CATEGORIES.find(c => c.id === id);
const partnerById = id => TAHBIVA.PARTNERS.find(p => p.id === id);

// ═══ State (draft) ═══════════════════════════════════════════════════════════
// status[hobby] = 'love' (התחביבים שלי) | 'try' (רוצה לנסות) | 'no' (לא בשבילי — never shown)
const fresh = () => ({ screen: 'hi', hist: [], tot: [], status: {}, cats: [], dTab: 0, disc: null, discIdx: 0,
                       looking: [], partners: [], pReturn: false, aboutStep: 0, bio: '', age: '', city: '', phone: '' });
let S;
try { S = Object.assign(fresh(), JSON.parse(localStorage.getItem(TAHBIVA_DRAFT_KEY)) || {}); } catch (_) { S = fresh(); }
function save() { try { localStorage.setItem(TAHBIVA_DRAFT_KEY, JSON.stringify(S)); } catch (_) {} }

const $   = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const rnd = arr => arr[Math.floor(Math.random() * arr.length)];
const withStatus = st => Object.keys(S.status).filter(n => S.status[n] === st);
const positives = () => withStatus('love');
const tries     = () => withStatus('try');
const isOn = n => S.status[n] === 'love';
// Adds a hobby unless the profile is full; returns false when it couldn't
function addLove(n) {
  if (isOn(n)) return true;
  if (positives().length >= MAX_HOBBIES) { toast(`אפשר לבחור עד ${MAX_HOBBIES} תחביבים 🙂`); return false; }
  S.status[n] = 'love';
  return true;
}

let toastT;
function toast(msg) { const t = $('toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
function say(id, text) { const el = $(id); el.style.opacity = 0; setTimeout(() => { el.textContent = text; el.style.opacity = 1; }, 150); }

// ═══ Navigation ═════════════════════════════════════════════════════════════
const RENDER = { tot: renderTot, interests: renderInterests, details: renderDetails, looking: renderLooking, partners: renderPartners,
                 discover: renderDiscover, profile: renderProfile, where: renderWhere, nearby: renderNearby, about: renderAbout, ready: renderReady };

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
  if (prev === 'discover' && S.disc && S.disc.length && S.discIdx >= S.disc.length) { S.discIdx--; delete S.status[S.disc[S.discIdx]]; }
  S.screen = prev;
  (RENDER[prev] || (() => {}))();
  show(prev, -1);
  chrome(); save();
}

function chrome() {
  const i = DOTS.indexOf(S.screen);
  $('dots').innerHTML = i < 0 ? '' : DOTS.map((_, k) => `<span class="dot ${k === i ? 'on' : ''}"></span>`).join('');
}

// ═══ This or that — preference only, never adds hobbies ═════════════════════
let totLock = false;
function startTot() { S.tot = []; go('tot'); }
function renderTot() {
  if (S.tot.length >= TAHBIVA.TOT.length) S.tot.pop();   // reopened mid-transition → ask the last one again
  const r = S.tot.length;
  if (S.tot.length === 0 || !$('totSay').textContent) $('totSay').textContent = 'זה או זה? בלי לחשוב יותר מדי 😉';
  const { q, opts } = TAHBIVA.TOT[r];
  const opt = (o, k) => `<button class="tile w-full p-5 text-center" onclick="pickTot(${k}, this)">
      <div class="text-5xl mb-2">${o.e}</div><div class="text-xl font-black">${o.label}</div></button>`;
  $('totBox').innerHTML = `<div class="pop flex flex-col gap-3">
      <div class="text-center text-sm font-bold text-[#a59bc7]">${r + 1} / ${TAHBIVA.TOT.length}</div>
      <h3 class="text-center text-xl font-black mb-1">${q}</h3>
      ${opt(opts[0], 0)}<div class="text-center font-black text-[#c4b5fd]">או</div>${opt(opts[1], 1)}</div>`;
}
function pickTot(k, el) {
  if (totLock || S.tot.length >= TAHBIVA.TOT.length) return;
  totLock = true;
  el.classList.add('on');
  S.tot.push(k);
  say('totSay', TAHBIVA.TOT[S.tot.length - 1].opts[k].reply);
  save();
  const done = S.tot.length >= TAHBIVA.TOT.length;
  setTimeout(() => {
    if (!done) { totLock = false; return renderTot(); }
    say('totSay', 'יש לי כמה כיוונים שאולי יעניינו אותך 🌱 בוא/י נראה מה באמת מדבר אליך!');
    setTimeout(() => { totLock = false; if (S.screen === 'tot') go('interests'); }, 1800);
  }, 1100);
}
// Category ids the answers lean to, strongest first
function worldWeights() {
  const w = {};
  S.tot.forEach((k, i) => TAHBIVA.TOT[i] && TAHBIVA.TOT[i].opts[k].cats.forEach(id => w[id] = (w[id] || 0) + 1));
  return Object.keys(w).sort((a, b) => w[b] - w[a]).slice(0, 3);
}

// ═══ Step 1: broad categories (answers reorder + highlight, nothing pre-selected) ═
const catOrder = () => { const top = worldWeights(); return [...top.map(catById).filter(Boolean), ...HOBBY_CATEGORIES.filter(c => !top.includes(c.id))]; };
function renderInterests() {
  const top = worldWeights();
  $('catGrid').innerHTML = catOrder().map((c, i) => {
    const on = S.cats.includes(c.id);
    return `<div style="animation:pop .35s ease ${i * 30}ms backwards">
      <button class="cat-card ${on ? 'on' : ''}" onclick="toggleCat('${c.id}', this)">
        <span class="text-3xl">${c.emoji}</span><span class="font-black text-lg flex-1">${c.label}
          ${top.includes(c.id) ? '<span class="tag align-middle">✨ אולי בשבילך</span>' : ''}</span>
        <span class="mark">${on ? '✓' : '+'}</span></button></div>`;
  }).join('');
  $('interestsNext').style.opacity = S.cats.length ? 1 : .45;
}
function toggleCat(id, el) {
  const on = S.cats.includes(id);
  S.cats = on ? S.cats.filter(x => x !== id) : [...S.cats, id];
  // Un-picking a category drops the hobbies marked 💚 in it
  if (on) catById(id).items.forEach(n => { if (isOn(n)) delete S.status[n]; });
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
  $('dNext').textContent = last ? 'סיום ←' : 'הבא ←';
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
  go('looking');
}

// ═══ Looking for (friends / partners / romantic) ═══════════════════════════
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

// ═══ Hobby partners — a separate preference, doesn't touch the hobby list ═══
function renderPartners() {
  $('partnerBox').innerHTML = TAHBIVA.PARTNERS.map(p => `
    <button class="tile p-5 flex items-center gap-4 text-right ${S.partners.includes(p.id) ? 'on' : ''}" onclick="togglePartner('${p.id}', this)">
      <span class="text-4xl">${p.e}</span><span class="text-lg font-black">${p.label}</span></button>`).join('');
}
function togglePartner(id, el) {
  S.partners = S.partners.includes(id) ? S.partners.filter(x => x !== id) : [...S.partners, id];
  el.classList.toggle('on', S.partners.includes(id));
  save();
}
function partnersNext() {
  // Opened from "התחביבים שלי" → go straight back there
  if (S.pReturn) { S.pReturn = false; return go('profile'); }
  toDiscover();
}
function editPartners() { S.pReturn = true; go('partners'); }

// ═══ Discover: one hobby from the lists, picked by the user's areas ═════════
function discPool(exclude) {
  return Object.keys(TAHBIVA.LINES).filter(n => H[n] && !(n in S.status) && !exclude.includes(n));
}
function buildDisc() {
  // "לא בשבילי" pushes that hobby's area to the back
  const noCats = withStatus('no').map(n => hob(n).w);
  const liked = HOBBY_CATEGORIES.filter(c => c.items.some(isOn)).map(c => c.id);
  const pref = [...new Set([...chosenCats().map(c => c.id), ...worldWeights(), ...liked])]
    .sort((a, b) => noCats.filter(x => x === a).length - noCats.filter(x => x === b).length);
  const pool = discPool([]);
  const best = pref.map(w => pool.filter(n => H[n].w === w)).find(c => c.length) || pool;
  S.disc = best.length ? [rnd(best)] : [];
  S.discIdx = 0;
}
// Builds the card; with nothing left to suggest, skips straight to the profile
function toDiscover() {
  buildDisc();
  if (!S.disc.length) return go('profile');
  go('discover');
}
let cardLock = false;
function renderDiscover() {
  if (!S.disc) buildDisc();
  if (!S.disc.length) return;
  if (S.discIdx >= S.disc.length) { S.discIdx = S.disc.length - 1; delete S.status[S.disc[S.discIdx]]; }
  const h = hob(S.disc[S.discIdx]);
  $('discSay').textContent = 'רעיון אחד שאולי לא חשבת עליו';
  $('discSlot').innerHTML = `<div id="hcard" class="hcard pop">
      <div class="text-7xl mb-3">${h.e}</div>
      <h3 class="text-2xl font-black">${esc(h.n)}</h3>
      <p class="text-[#7c6aa8] font-semibold mt-1">${esc(h.d)}</p></div>
    <div class="grid grid-cols-3 gap-2 mt-5">
      <button class="st" style="background:#dcfce7" onclick="rateDisc('love')">💚 מעניין אותי</button>
      <button class="st" style="background:#fef3c7" onclick="rateDisc('try')">🤔 רוצה לנסות</button>
      <button class="st" style="background:#f3efff" onclick="rateDisc('no')">🙅 לא בשבילי</button></div>`;
}
function rateDisc(st) {
  if (cardLock) return;
  const name = S.disc[S.discIdx];
  if (st === 'love' && !addLove(name)) return;
  if (st !== 'love') S.status[name] = st;
  cardLock = true;
  $('hcard').classList.add(st === 'no' ? 'fly-skip' : 'fly-love');
  setTimeout(() => {
    S.discIdx++;
    say('discSay', rnd(SAY[st]));
    cardLock = false;
    save();
    setTimeout(() => go('profile'), 900);   // time to read Tahbiva's reply
  }, 260);
}
function undoDisc() {
  S.discIdx--;
  delete S.status[S.disc[S.discIdx]];
  renderDiscover(); save();
}
function discoverMore() {
  buildDisc();
  if (!S.disc.length) return toast('נגמרו לי הרעיונות כרגע 😅');
  go('discover');
}

// ═══ My hobbies: 💚 mine · 🌱 want to try · 🤝 partners ════════════════════
let chipNames = [];
function renderProfile() {
  const pos = positives(), tr = tries();
  const byCat = {};
  pos.forEach(n => { const w = hob(n).w; byCat[w] = (byCat[w] || 0) + 1; });
  const vibes = Object.keys(byCat).filter(catById).sort((a, b) => byCat[b] - byCat[a]).slice(0, 2).map(id => catById(id).vibe);
  $('profileSay').textContent = !pos.length && !tr.length ? 'עוד ריק פה. גם זו התחלה 🙂'
    : vibes.length === 2 ? `נראה שאת/ה בקטע של ${vibes[0]} ו${vibes[1]} ✨`
    : vibes.length ? `נראה שאת/ה בקטע של ${vibes[0]} ✨` : 'פרופיל מקורי! ✨';
  chipNames = [...pos, ...tr];
  // ⇄ moves a hobby between "mine" and "want to try"
  const chip = (n, i, to) => `<span class="chip">${hob(n).e} ${esc(n)}
      <button class="x" onclick="moveHobby(${i})" aria-label="${to}" title="${to}">⇄</button>
      <button class="x" onclick="removeHobby(${i}, this)" aria-label="הסרה">✕</button></span>`;
  const empty = '<p class="text-sm text-[#a59bc7]">עוד אין</p>';
  $('profileBox').innerHTML = `<div class="tile p-4 mb-3"><div class="font-black mb-2">💚 התחביבים שלי</div>
      ${pos.length ? pos.map((n, i) => chip(n, i, 'העברה לרוצה לנסות')).join('') : empty}</div>
    <div class="tile p-4 mb-3"><div class="font-black mb-2">🌱 רוצה לנסות</div>
      ${tr.length ? tr.map((n, i) => chip(n, pos.length + i, 'העברה לתחביבים שלי')).join('') : empty}</div>
    <div class="tile p-4 mb-3"><div class="flex items-center justify-between mb-2"><span class="font-black">🤝 שותפים לתחביב</span>
        <button class="text-xs font-bold text-[#7c3aed]" onclick="editPartners()">עריכה</button></div>
      ${S.partners.length ? S.partners.map(partnerById).filter(Boolean).map(p =>
        `<span class="chip" style="padding-left:12px">${p.e} ${p.label}</span>`).join('') : empty}</div>
    <form onsubmit="addCustom(event)" class="flex gap-2 mt-1">
      <input id="profileAdd" class="pill flex-1 outline-none" maxlength="${HOBBY_PICKER_MAX_LEN}" placeholder="+ הוסף תחביב">
      <button class="pill" style="background:var(--p);color:#fff">הוסף</button></form>`;
}
function moveHobby(i) {
  const n = chipNames[i];
  if (isOn(n)) S.status[n] = 'try';
  else if (!addLove(n)) return;
  save(); renderProfile();
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

// ═══ Where — city from CITIES (needed for distance) ═════════════════════════
let cityPicker = null, usersCache = null;
const loadUsers = () => usersCache ? Promise.resolve(usersCache) : fetchAllUsers().then(u => (usersCache = u));
// Quick picks = the cities with the most users (falls back to a fixed list)
function topCities() {
  if (!usersCache) return QUICK_CITIES;
  const n = {};
  usersCache.forEach(u => { if (u.city && CITIES.some(c => c.name === u.city)) n[u.city] = (n[u.city] || 0) + 1; });
  const top = Object.keys(n).sort((a, b) => n[b] - n[a]).slice(0, 5);
  return top.length ? top : QUICK_CITIES;
}
function renderCityChips() {
  $('whereChips').innerHTML = topCities().filter(c => CITIES.some(x => x.name === c)).map(c =>
    `<button type="button" class="pill ${S.city === c ? 'on' : ''}" onclick="pickCity('${c}')">${c}</button>`).join('');
}
function renderWhere() {
  if (!cityPicker) {
    cityPicker = createCityPicker('whereCity', 'field');
    $('whereCity').nextElementSibling.style.width = '100%';   // picker wrapper → full width
  }
  cityPicker.setCity(S.city);
  renderCityChips();
  if (!usersCache) loadUsers().then(() => { if (S.screen === 'where') renderCityChips(); }).catch(err => console.error('city counts:', err));
}
function pickCity(c) { cityPicker.setCity(c); whereNext(); }
function whereNext() {
  const v = $('whereCity').value;
  if (!v) return toast('בחר/י עיר מהרשימה 🙂');
  S.city = v;
  go('nearby');
}

// ═══ Nearby — real people only: shared hobbies, shared "want to try", shared partner types ═
async function findNearby() {
  const here = CITIES.find(c => c.name === S.city);
  const users = await loadUsers();
  const mine = positives(), myTry = tries();
  return users
    .filter(u => u.latitude != null && u.longitude != null)
    .map(u => {
      const shared   = getUserHobbies(u).filter(h => mine.includes(h));
      const bothTry  = (u.wantToTry || []).filter(h => myTry.includes(h));
      const partners = (u.partnerTypes || []).filter(p => S.partners.includes(p));
      return { u, shared, bothTry, partners, score: shared.length * 3 + bothTry.length * 2 + partners.length,
               km: distanceKm(here.lat, here.lng, u.latitude, u.longitude) };
    })
    .filter(x => x.score && x.km <= NEAR_KM)
    .sort((a, b) => b.score - a.score || a.km - b.km)
    .slice(0, 3);
}
async function findActivity() {
  const snap = await db.collection('events')
    .where('dateTime', '>=', firebase.firestore.Timestamp.now())
    .orderBy('dateTime').limit(40).get();
  const mine = [...positives(), ...tries()];
  // Same loose matching as the events tab (eventMatchesUser in profiles-events.js)
  return snap.docs.map(d => d.data()).find(ev => {
    const tags = (ev.associatedHobbies && ev.associatedHobbies.length ? ev.associatedHobbies : [ev.hobby || '']).map(stripEmoji).filter(Boolean);
    return mine.some(k => tags.some(t => t.includes(k) || k.includes(t)));
  }) || null;
}
function personCard({ u, shared, bothTry, partners, km }) {
  const name = displayName(u.fullName);
  const chips = list => list.slice(0, 3).map(n => `<span class="chip" style="padding-left:12px">${hob(n).e} ${esc(n)}</span>`).join('');
  return `<div class="tile p-4 mb-2"><div class="flex items-center gap-3 mb-2">
      <div class="w-11 h-11 rounded-full bg-[#f3efff] grid place-items-center font-black text-[#7c3aed]">${esc(getInitials(name))}</div>
      <div class="flex-1"><div class="font-bold">${esc(name)}${u.age ? `, ${esc(u.age)}` : ''}</div>
        <div class="text-xs text-[#8b7fb0]">📍 ${km < 1 ? 'ממש לידך' : `כ-${Math.round(km)} ק״מ ממך`}</div></div></div>
    ${shared.length ? `<div class="mb-2">${chips(shared)}</div>` : ''}
    ${bothTry.length ? `<div class="text-xs font-bold text-[#7c6aa8] mb-1">🌱 שניכם רוצים לנסות</div><div class="mb-2">${chips(bothTry)}</div>` : ''}
    ${partners.length ? `<div class="text-xs font-bold text-[#7c6aa8] mb-2">🤝 שניכם מחפשים: ${partners.map(partnerById).filter(Boolean).map(p => p.label).join(' · ')}</div>` : ''}
    <button class="ice" onclick="toast('אפשר לשלוח הודעה מיד אחרי ההרשמה 💌')">💬 שליחת הודעה</button></div>`;
}
async function renderNearby() {
  $('nearSay').textContent = `מחפשת לך אנשים ליד ${S.city}… 👀`;
  $('nearBox').innerHTML = `<div id="nearList" class="text-center text-[#a59bc7] font-semibold py-6">⏳</div>`;
  const [people, act] = await Promise.all([
    findNearby().catch(err => { console.error('nearby users:', err); return null; }),
    findActivity().catch(err => { console.error('nearby activity:', err); return null; }),
  ]);
  if (S.screen !== 'nearby') return;
  if (people === null) {
    $('nearSay').textContent = 'לא הצלחתי לטעון כרגע 😕';
    $('nearList').textContent = 'יש בעיה בטעינת האנשים מהאזור. אפשר להמשיך בכל זאת.';
    return;
  }
  say('nearSay', people.length === 1 ? `מצאתי מישהו ליד ${S.city} עם תחביבים משותפים 👀`
    : people.length ? `מצאתי ${people.length} אנשים באזור שאולי יהיה לכם על מה לדבר 👀`
    : 'עוד אין פה אנשים עם תחביבים משותפים באזור — אולי את/ה תהיה/י מהראשונים 🌱');
  $('nearList').outerHTML = `<div class="text-right">${people.map(personCard).join('')}
    ${act ? `<div class="font-black mt-4 mb-2">📅 פעילות שאולי תתאים</div>
      <div class="tile p-3 flex items-center gap-3">
        <div class="text-3xl w-12 h-12 rounded-2xl bg-[#f3efff] grid place-items-center">📅</div>
        <div class="flex-1 min-w-0"><div class="font-bold truncate">${esc(act.title || '')}</div>
          <div class="text-xs text-[#8b7fb0]">${esc(formatEventDate(act.dateTime))}${act.location ? ` · ${esc(act.location)}` : ''}</div></div></div>` : ''}</div>`;
}

// ═══ About (one question per screen) / ready ═══════════════════════════════
function startAbout() { S.aboutStep = 0; go('about'); }
function renderAbout() {
  const i = S.aboutStep;
  if (i >= ABOUT.length) return;
  const a = ABOUT[i];
  $('aboutSay').textContent = a.q;
  $('aboutForm').innerHTML = `<div class="pop flex flex-col items-center gap-4">
      <div class="text-sm font-bold text-[#a59bc7]">${i + 1} / ${ABOUT.length}</div>
      <div class="text-6xl">${a.e}</div>
      ${a.area
        ? `<textarea id="aboutIn" class="tile w-full p-4 text-base font-semibold outline-none resize-none focus:border-[#7c3aed]" rows="5" maxlength="300"
             placeholder="${a.ph}">${esc(S[a.k] || '')}</textarea>`
        : `<input id="aboutIn" class="field" ${a.in} value="${esc(S[a.k] || '')}">`}
      ${a.note ? `<p class="text-sm font-semibold text-[#8b7fb0] text-center">${a.note}</p>` : ''}
    </div>
    <div class="mt-auto pt-5"><button class="btn btn-p">המשך ←</button>
      ${a.optional ? `<button type="button" class="link block mx-auto" onclick="skipAbout()">אדלג בינתיים</button>` : ''}</div>`;
  setTimeout(() => $('aboutIn') && $('aboutIn').focus({ preventScroll: true }), 400);
}
function nextAbout() {
  S.aboutStep++; save();
  if (S.aboutStep >= ABOUT.length) return go('ready');
  renderAbout();
}
function aboutNext(e) {
  e.preventDefault();
  const a = ABOUT[S.aboutStep];
  let v = $('aboutIn').value.trim();
  if (a.k === 'age' && !(+v >= 18 && +v <= 99)) return toast('גיל בין 18 ל-99 🙂');
  if (a.k === 'phone' && v) {
    try { v = sanitizePhone(v); } catch (err) { return toast(err.message); }
  }
  S[a.k] = v;
  nextAbout();
}
function skipAbout() { S[ABOUT[S.aboutStep].k] = ''; nextAbout(); }
function renderReady() {
  const n = positives().length;
  $('readyText').textContent = n ? `יש ${n} תחביבים בפרופיל שלך. בוא/י נגלה אנשים שאפשר לחלוק איתם אותם.`
    : 'בוא/י נגלה ביחד מה מעניין אותך ונמצא אנשים לחלוק איתם חוויות.';
}
// Hand-off: register.html reads the draft after sign-in and saves the profile
function finish() {
  if (!positives().length) { toast('סמנ/י לפחות תחביב אחד 🙂'); return go('interests'); }
  if (!S.city) { toast('איפה את/ה גר/ה? 🙂'); return go('where'); }
  if (!S.age) { toast('חסר עוד פרט קטן 🙂'); return startAbout(); }
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
