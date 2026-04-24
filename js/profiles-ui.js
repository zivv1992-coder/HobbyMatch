// ══════════════════════════════════════════════════════════════════════════════
// profiles-ui.js — Navigation, modals, report, feedback, logout, tour
// ══════════════════════════════════════════════════════════════════════════════

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tab) {
  activeTab = tab;
  const panes = ['discover', 'events', 'matches'];
  panes.forEach(p => {
    document.getElementById('pane' + p.charAt(0).toUpperCase() + p.slice(1))
      .classList.toggle('hidden', tab !== p);
    const btn = document.getElementById('tab' + p.charAt(0).toUpperCase() + p.slice(1));
    btn.classList.toggle('active',       tab === p);
    btn.classList.toggle('text-gray-500', tab !== p);
  });
  if (tab === 'matches') loadMatches();
  if (tab === 'events')  loadEvents();
}

// ── Hamburger Menu ────────────────────────────────────────────────────────────
function toggleHamburger() {
  document.getElementById('hamburgerMenu').classList.toggle('hidden');
}
function closeHamburger() {
  document.getElementById('hamburgerMenu').classList.add('hidden');
}

// ── About Modal ───────────────────────────────────────────────────────────────
function openAboutModal()  { document.getElementById('aboutOverlay').classList.remove('hidden'); }
function closeAboutModal() { document.getElementById('aboutOverlay').classList.add('hidden'); }

// ── Report from Menu ──────────────────────────────────────────────────────────
function openReportFromMenu() {
  const existing = document.getElementById('reportMenuModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'reportMenuModal';
  modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-black text-gray-800 text-base">🚩 דווח על משתמש</h3>
        <button onclick="document.getElementById('reportMenuModal').remove()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <p class="text-xs text-gray-500 mb-3">שם הפרופיל המדווח:</p>
      <input id="reportSearchInput" type="text" placeholder="שם מלא..."
        oninput="renderReportSearchResults()"
        class="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-purple-400 mb-3 transition" dir="rtl"/>
      <div id="reportSearchResults" class="space-y-1 max-h-52 overflow-y-auto"></div>
    </div>`;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
  document.getElementById('reportSearchInput').focus();
}

function renderReportSearchResults() {
  const q  = (document.getElementById('reportSearchInput')?.value || '').trim().toLowerCase();
  const el = document.getElementById('reportSearchResults');
  if (!q) { el.innerHTML = ''; return; }

  const results = allUsers.filter(u =>
    (u.fullName || '').toLowerCase().includes(q) && u.email !== me.email
  ).slice(0, 6);

  if (results.length === 0) {
    el.innerHTML = `<p class="text-xs text-gray-400 text-center py-3">לא נמצאו משתמשים</p>`;
    return;
  }

  el.innerHTML = results.map(u => {
    const photo = u.profilePhotoURL || u.hobbyImageUrl;
    const imgHtml = photo
      ? `<img src="${photo}" class="w-9 h-9 rounded-full object-cover shrink-0 border border-purple-100"/>`
      : `<div class="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-base font-black text-purple-600">${(u.fullName||'?')[0]}</div>`;
    const safeEmail   = (u.email||'').replace(/'/g,"\\'");
    const safeName    = (u.fullName||'').replace(/'/g,"\\'");
    const safeMyName  = (me.fullName||'').replace(/'/g,"\\'");
    const safeMyEmail = (me.email||'').replace(/'/g,"\\'");
    return `
      <button onclick="document.getElementById('reportMenuModal').remove(); showReportModal('${safeEmail}','${safeName}','${safeMyEmail}','${safeMyName}')"
        class="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-purple-50 transition text-right">
        ${imgHtml}
        <div class="min-w-0">
          <p class="font-bold text-gray-800 text-sm">${u.fullName}</p>
          <p class="text-xs text-gray-400 truncate">📍 ${u.city||''} · 🎯 ${u.hobby||''}</p>
        </div>
      </button>`;
  }).join('');
}

// ── Feedback Modal ────────────────────────────────────────────────────────────
function openFeedbackModal() {
  document.getElementById('feedbackText').value = '';
  document.getElementById('feedbackCharCount').textContent = '0 / 1000';
  document.getElementById('feedbackError').classList.add('hidden');
  document.getElementById('feedbackSendBtn').disabled = false;
  document.getElementById('feedbackSendBtn').textContent = 'שלח';
  document.getElementById('feedbackOverlay').classList.remove('hidden');
  document.getElementById('feedbackText').focus();
}
function closeFeedbackModal() {
  document.getElementById('feedbackOverlay').classList.add('hidden');
}

async function submitFeedback() {
  const text  = document.getElementById('feedbackText').value.trim();
  const errEl = document.getElementById('feedbackError');
  const btn   = document.getElementById('feedbackSendBtn');
  errEl.classList.add('hidden');

  if (!text) {
    errEl.textContent = 'אנא כתוב משהו לפני השליחה.';
    errEl.classList.remove('hidden');
    return;
  }

  btn.disabled = true;
  btn.textContent = 'שולח...';

  try {
    await db.collection('feedback').add({
      text,
      userEmail: me.email,
      userName:  me.fullName || me.email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    closeFeedbackModal();
    showToast('תודה על הפידבק! 🙏', 'bg-purple-600');
  } catch (err) {
    errEl.textContent = 'שגיאה בשליחה. נסה שוב.';
    errEl.classList.remove('hidden');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'שלח';
  }
}

// ── Logout ────────────────────────────────────────────────────────────────────
function handleLogout() {
  clearSession();
  window.location.href = 'index.html';
}

// ── Product Tour ──────────────────────────────────────────────────────────────
function startTour() {
  const driverFn  = window.driver.js.driver;
  const driverObj = driverFn({
    showProgress: true,
    steps: TOUR_STEPS,
    nextBtnText: 'Next →',
    prevBtnText: '← Back',
    doneBtnText: 'Done ✓',
    popoverClass: 'hobby-tour-popover',
    onDestroyed: function() {
      localStorage.setItem('hobbyMatchTourDone', '1');
    }
  });
  driverObj.drive();
}

// ── NEON CONNECTION CARD ──────────────────────────────────────────────────────
// Future "Neon Connection Card" UI logic goes here.
// This card will display a matched user in a glowing neon style.
// Example entry point: function openNeonConnectionCard(userEmail) { ... }
