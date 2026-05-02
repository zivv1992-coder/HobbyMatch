// ══════════════════════════════════════════════════════════════════════════════
// profiles-matches.js — Discover feed, lazy loading, filters, likes, discovery
// ══════════════════════════════════════════════════════════════════════════════

// ── Load discover feed ────────────────────────────────────────────────────────
async function loadFeed() {
  try {
    const [users, liked] = await Promise.all([
      fetchAllUsers(),
      fetchLikedEmails(me.email)
    ]);
    allUsers    = users.filter(u => u.email !== me.email);
    likedEmails = liked;

    document.getElementById('loadingDiscover').classList.add('hidden');
    const grid = document.getElementById('feedGrid');
    grid.classList.remove('hidden');
    renderFeedGrid();
  } catch (err) {
    document.getElementById('loadingDiscover').innerHTML =
      '<p class="text-red-400 font-semibold">שגיאה בטעינת הפרופילים. רענן את הדף.</p>';
    console.error(err);
  }
}

// ── Radius filter ─────────────────────────────────────────────────────────────
function setRadius(km) {
  radiusKm = km;
  document.querySelectorAll('.radius-btn').forEach(b => {
    const match = km === null ? b.dataset.r === 'all' : Number(b.dataset.r) === km;
    b.classList.toggle('active', match);
  });
  renderFeedGrid();
}

// ── Lazy-load helpers ─────────────────────────────────────────────────────────
function _detachLazyObserver() {
  if (_lazyObserver) { _lazyObserver.disconnect(); _lazyObserver = null; }
  document.getElementById('lazyLoader')?.remove();
}

function _appendLazyBatch() {
  const grid  = document.getElementById('feedGrid');
  const batch = _lazyFiltered.slice(_lazyShown, _lazyShown + LAZY_PAGE_SIZE);
  if (batch.length === 0) { _detachLazyObserver(); return; }
  const frag = document.createDocumentFragment();
  const tmp  = document.createElement('div');
  tmp.innerHTML = batch.map(u => renderCard(u, likedEmails.has(u.email), me, _currentMatches.some(m => m.email === u.email))).join('');
  while (tmp.firstChild) frag.appendChild(tmp.firstChild);
  document.getElementById('lazyLoader')?.remove();
  grid.appendChild(frag);
  _lazyShown += batch.length;
  initCarousels();
  if (_lazyShown < _lazyFiltered.length) {
    const sentinel = document.createElement('div');
    sentinel.id = 'lazyLoader';
    sentinel.className = 'col-span-full flex justify-center py-4';
    sentinel.innerHTML = `<div class="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>`;
    grid.appendChild(sentinel);
    _lazyObserver = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting) { _lazyObserver.disconnect(); _appendLazyBatch(); }
    }, { threshold: 0.1 });
    _lazyObserver.observe(sentinel);
  }
}

// ── Romantic filter ───────────────────────────────────────────────────────────
function toggleRomanticFilter() {
  _romanticFilterOn = !_romanticFilterOn;
  const toggle = document.getElementById('filterRomanticToggle');
  const thumb  = document.getElementById('filterRomanticThumb');
  const text   = document.getElementById('filterRomanticText');
  if (_romanticFilterOn) {
    toggle.style.background = '#ec4899';
    thumb.style.right = 'auto';
    thumb.style.left  = '2px';
    text.className = 'text-sm font-semibold text-pink-600';
  } else {
    toggle.style.background = '#d1d5db';
    thumb.style.left  = 'auto';
    thumb.style.right = '2px';
    text.className = 'text-sm font-semibold text-gray-500';
  }
  renderFeedGrid();
}

function applyDiscoverFilters() { renderFeedGrid(); }

function renderFeedGrid() {
  const grid = document.getElementById('feedGrid');
  _detachLazyObserver();

  const ageMin  = parseInt(document.getElementById('filterAgeMin')?.value) || null;
  const ageMax  = parseInt(document.getElementById('filterAgeMax')?.value) || null;
  const romantic = _romanticFilterOn;
  const hobbyQ  = (document.getElementById('filterHobby')?.value || '').trim().toLowerCase();

  let filtered = allUsers;
  if (radiusKm !== null && me.latitude) {
    filtered = filtered.filter(u => u.latitude &&
      distanceKm(me.latitude, me.longitude, u.latitude, u.longitude) <= radiusKm);
  }
  if (ageMin) filtered = filtered.filter(u => (u.age || 0) >= ageMin);
  if (ageMax) filtered = filtered.filter(u => (u.age || 0) <= ageMax);
  if (romantic) filtered = filtered.filter(u => u.romantic);
  if (hobbyQ)   filtered = filtered.filter(u => (u.hobby || '').toLowerCase().includes(hobbyQ));


  if (filtered.length === 0) {
    grid.innerHTML = renderEmpty('לא נמצאו משתמשים עם הפילטרים שבחרת.');
    return;
  }

  grid.innerHTML = '';
  _lazyFiltered  = filtered;
  _lazyShown     = 0;
  _appendLazyBatch();
}

// ── Load matches ──────────────────────────────────────────────────────────────
async function loadMatches() {
  const loadEl = document.getElementById('loadingMatches');
  const listEl = document.getElementById('matchesList');
  loadEl.classList.remove('hidden');
  listEl.classList.add('hidden');

  try {
    const matches = await fetchMatches(me.email);
    loadEl.classList.add('hidden');
    listEl.classList.remove('hidden');

    if (matches.length === 0) {
      listEl.innerHTML = renderEmpty('אין עדיין התאמות. המשך ללייק!');
      return;
    }
    listEl.innerHTML = matches.map(u => renderMatchCard(u, me)).join('');
    initMatchChatListeners(matches);
  } catch (err) {
    loadEl.innerHTML = '<p class="text-red-400 font-semibold">שגיאה בטעינת ההתאמות.</p>';
    console.error(err);
  }
}

// ── Like button UI update helper ──────────────────────────────────────────────
function updateLikeBtn(btn, isLiked) {
  if (btn.id === 'modalLikeBtn') {
    btn.textContent = isLiked ? '✅ הלייק נשלח — לחץ לביטול' : 'לייק';
    btn.className = isLiked
      ? 'w-full py-3 rounded-xl font-bold text-sm transition bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 border border-transparent hover:border-red-200'
      : 'w-full py-3 rounded-xl font-bold text-sm transition bg-gradient-to-l from-purple-700 to-blue-600 text-white hover:opacity-90';
  } else {
    btn.innerHTML = `${isLiked ? HEART_FILLED : HEART_OUTLINE}<span class="like-label text-sm font-semibold">${isLiked ? 'ביטול לייק' : 'לייק'}</span>`;
    btn.className = isLiked
      ? 'flex items-center gap-1.5 transition-transform active:scale-90 text-red-500'
      : 'flex items-center gap-1.5 transition-transform active:scale-90 text-gray-400 hover:text-red-400';
  }
}

// ── Like handler ──────────────────────────────────────────────────────────────
async function handleLike(theirEmail, theirName, btn) {
  const wasLiked = btn.dataset.liked === 'true';
  btn.disabled = true;
  if (btn.id === 'modalLikeBtn') {
    btn.textContent = '...';
  } else {
    const label = btn.querySelector('.like-label');
    if (label) label.textContent = '...';
  }

  try {
    if (wasLiked) {
      await removeLike(me.email, theirEmail);
      likedEmails.delete(theirEmail);
      btn.dataset.liked = 'false';
      updateLikeBtn(btn, false);
    } else {
      await saveLike(me.email, theirEmail);
      likedEmails.add(theirEmail);
      btn.dataset.liked = 'true';
      updateLikeBtn(btn, true);

      const isMatch = await checkMatch(me.email, theirEmail);
      if (isMatch) {
        const matchedUser = allUsers.find(u => u.email === theirEmail);
        if (matchedUser) showMatchPopup(me, matchedUser);
      }
    }
  } catch (err) {
    showToast('שגיאה בשליחת הלייק. נסה שוב.', 'bg-red-500');
    console.error(err);
    btn.dataset.liked = wasLiked.toString();
    updateLikeBtn(btn, wasLiked);
  } finally {
    btn.disabled = false;
  }
}

// ── Unmatch ───────────────────────────────────────────────────────────────────
async function handleUnmatch(theirEmail, btn) {
  if (!confirm('לבטל את המאצ\'? הצ\'אט ישמר אבל לא תופיעו יותר בהתאמות.')) return;
  btn.disabled = true;
  btn.textContent = 'מבטל...';
  try {
    await removeLike(me.email, theirEmail);
    await removeLike(theirEmail, me.email);
    document.getElementById('profileModal')?.remove();
    showToast('המאצ\' בוטל', 'bg-gray-600');
    loadMatches();
  } catch (e) {
    btn.disabled = false;
    btn.textContent = '💔 ביטול מאצ\'';
    showToast('שגיאה, נסה שוב', 'bg-red-500');
  }
}

// ── Like from profile modal ───────────────────────────────────────────────────
async function handleModalLike(theirEmail, theirName, btn) {
  await handleLike(theirEmail, theirName, btn);
  // Sync the card button in the grid
  const cardBtn = document.querySelector(
    `[data-email="${theirEmail}"] button[data-liked]`
  );
  if (cardBtn) {
    cardBtn.dataset.liked = btn.dataset.liked;
    updateLikeBtn(cardBtn, btn.dataset.liked === 'true');
  }
}

// ── Discovery section ─────────────────────────────────────────────────────────
async function initDiscovery() {
  const myHobbies = new Set(
    (me.hobby || '').split(',').map(h => h.trim().toLowerCase()).filter(Boolean)
  );

  // Load events if not yet loaded
  if (!eventsLoaded) {
    try {
      const snap = await db.collection('events').orderBy('dateTime').get();
      allEventsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { console.warn('Discovery events load error:', e); }
  }

  // Hobby suggestions: count hobbies from all users not in my list
  const hobbyCounts = {};
  allUsers.forEach(u => {
    (u.hobby || '').split(',').forEach(h => {
      const t = h.trim();
      if (!t) return;
      if (!myHobbies.has(t.toLowerCase())) {
        hobbyCounts[t] = (hobbyCounts[t] || 0) + 1;
      }
    });
  });
  _discHobbiesPool = Object.entries(hobbyCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([hobby, count]) => ({ hobby, count }));

  // Event suggestions: upcoming events with no hobby overlap
  const now = new Date();
  _discEventsPool = (allEventsData || []).filter(ev => {
    try {
      const d = ev.dateTime?.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime);
      if (d <= now) return false;
      const evHobbies = (ev.associatedHobbies || []).map(h => h.toLowerCase());
      return !evHobbies.some(h => myHobbies.has(h)) && evHobbies.length > 0;
    } catch { return false; }
  });

  _discHobbiesOff = 0;
  _discEventsOff  = 0;
  _renderDiscovery();
}

function _renderDiscovery() {
  const hobbies = _discHobbiesPool.slice(_discHobbiesOff, _discHobbiesOff + 3);
  const events  = _discEventsPool.slice(_discEventsOff,  _discEventsOff  + 3);

  if (hobbies.length === 0 && events.length === 0) {
    document.getElementById('discoverySection').classList.add('hidden');
    return;
  }
  document.getElementById('discoverySection').classList.remove('hidden');
  document.getElementById('discoverySeparator').classList.toggle('hidden', hobbies.length === 0 || events.length === 0);

  document.getElementById('discoveryHobbies').innerHTML = hobbies.map(({ hobby, count }) => `
    <div class="flex items-center justify-between px-4 py-3.5 hover:bg-purple-50 cursor-pointer transition"
      onclick="discoverHobby('${hobby.replace(/'/g, "\\'")}')">
      <div>
        <p class="font-bold text-gray-800 text-sm">${hobby}</p>
        <p class="text-xs text-gray-400 mt-0.5">${count} ${count === 1 ? 'אדם' : 'אנשים'} פעילים באזורך</p>
      </div>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" stroke-width="2.5"
        stroke-linecap="round" stroke-linejoin="round"><path d="M9 18l6-6-6-6"/></svg>
    </div>`).join('');

  document.getElementById('discoveryEvents').innerHTML = events.map(ev => {
    let dateStr = '';
    try {
      const d = ev.dateTime?.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime);
      dateStr = d.toLocaleDateString('he-IL', { day: 'numeric', month: 'long' });
    } catch {}
    return `
      <div class="flex items-start justify-between gap-3 px-4 py-3.5 hover:bg-purple-50 cursor-pointer transition"
        onclick="openEventDetailModal('${ev.id}')">
        <div class="flex-1 min-w-0">
          <p class="font-bold text-gray-800 text-sm truncate">${ev.title || ''}</p>
          <p class="text-xs text-gray-400 mt-0.5">${ev.location || ''} · ${dateStr}</p>
        </div>
        <span class="shrink-0 text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-full whitespace-nowrap">גילוי חדש</span>
      </div>`;
  }).join('');
}

function refreshDiscovery() {
  const hLen = _discHobbiesPool.length;
  const eLen = _discEventsPool.length;
  if (hLen > 3) _discHobbiesOff = (_discHobbiesOff + 3) % hLen;
  if (eLen > 3) _discEventsOff  = (_discEventsOff  + 3) % eLen;
  _renderDiscovery();
}

function discoverHobby(hobby) {
  const grid     = document.getElementById('feedGrid');
  const filtered = allUsers.filter(u =>
    (u.hobby || '').toLowerCase().includes(hobby.toLowerCase())
  );
  switchTab('discover');
  grid.innerHTML = filtered.length > 0
    ? filtered.map(u => renderCard(u, likedEmails.has(u.email), me, _currentMatches.some(m => m.email === u.email))).join('')
    : renderEmpty(`לא נמצאו אנשים עם תחביב "${hobby}" באזורך`);
  initCarousels();
}
