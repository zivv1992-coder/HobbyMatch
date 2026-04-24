// ══════════════════════════════════════════════════════════════════════════════
// profiles-boot.js — Session guard, boot sequence, and global event listeners
// Runs last (after all other modules are loaded).
// ══════════════════════════════════════════════════════════════════════════════

// ── Session guard ─────────────────────────────────────────────────────────────
if (!me) {
  const _evParam = new URLSearchParams(window.location.search).get('event');
  if (!_evParam) {
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = 'index.html?returnTo=' + returnTo;
  }
  // else: guest with ?event=xxx — allow limited view (modal only)
} else {
  document.getElementById('navName').textContent = me.fullName;
  if (me.email === ADMIN_EMAIL) {
    document.getElementById('adminLink').classList.remove('hidden');
  }
}

// ── Boot sequence ─────────────────────────────────────────────────────────────
if (me) {
  loadFeed().then(() => { initNotifications(); initDiscovery(); });
}
if (new URLSearchParams(location.search).get('new') === '1') {
  setTimeout(() => showToast('הפרופיל נוצר בהצלחה! ברוך הבא לקונקשן 🎉'), 600);
  history.replaceState(null, '', 'profiles.html');
}
// Guest deep-link: skip feed, load events and auto-open modal
if (!me && new URLSearchParams(location.search).get('event')) {
  loadEvents();
}

// ── Keyboard: Esc closes any open modal ──────────────────────────────────────
document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  closeEventDetailModal();
  closeAboutModal();
  closeChat();
});

// ── Hamburger: close when clicking outside ────────────────────────────────────
document.addEventListener('click', e => {
  const container = document.getElementById('hamburgerContainer');
  if (container && !container.contains(e.target)) closeHamburger();
});

// ── Feedback textarea: live char count ────────────────────────────────────────
document.getElementById('feedbackText').addEventListener('input', function () {
  document.getElementById('feedbackCharCount').textContent = `${this.value.length} / 1000`;
});

// ── Product tour: auto-start on first visit ───────────────────────────────────
window.addEventListener('load', function () {
  if (!localStorage.getItem('hobbyMatchTourDone')) {
    setTimeout(startTour, 1500);
  }
});
