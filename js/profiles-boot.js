// ══════════════════════════════════════════════════════════════════════════════
// profiles-boot.js — Session guard, boot sequence, and global event listeners
// Runs last (after all other modules are loaded).
// ══════════════════════════════════════════════════════════════════════════════

// ── Session guard ─────────────────────────────────────────────────────────────
if (me) {
  document.getElementById('navName').textContent = me.fullName;
  if (me.email === ADMIN_EMAIL) {
    document.getElementById('adminLink').classList.remove('hidden');
  }
}

// ── Boot sequence ─────────────────────────────────────────────────────────────
if (me) {
  loadFeed().then(() => {
    initNotifications();
    initDiscovery();
    const hasPhotos = (me.hobbyImages && me.hobbyImages.length > 0) || !!me.hobbyImageUrl;
    if (!hasPhotos) {
      document.getElementById('noHobbyPhotoBanner').classList.remove('hidden');
    }
  });
  db.collection('users').doc(sanitizeEmail(me.email)).update({ lastSeen: new Date() })
    .catch(() => {});
} else {
  // Guest: load browse feed and optionally open event deep-link
  loadFeed();
  if (new URLSearchParams(location.search).get('event')) loadEvents();
}
if (new URLSearchParams(location.search).get('new') === '1') {
  setTimeout(() => showToast('הפרופיל נוצר בהצלחה! ברוך הבא לקונקשן 🎉'), 600);
  history.replaceState(null, '', 'profiles.html');
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

// ── App Shortcut deep-link: route hash to correct tab on load ─────────────────
(function () {
  const hash = window.location.hash;
  if (!hash || !me) return;
  const map = { '#chat': 'matches', '#discover': 'discover', '#edit': 'discover' };
  const tab = map[hash];
  if (tab) {
    window.addEventListener('load', () => {
      switchTab(tab);
      if (hash === '#edit') setTimeout(openEditDrawer, 400);
      history.replaceState(null, '', 'profiles.html');
    });
  }
})();

// ── Product tour: auto-start on first visit ───────────────────────────────────
window.addEventListener('load', function () {
  const _tourKey = 'hobbyMatchTourDone_' + (me ? me.email : 'guest');
  if (!localStorage.getItem(_tourKey)) {
    localStorage.setItem(_tourKey, '1'); // mark before starting — prevents re-show on crash/close
    setTimeout(startTour, 1500);
  }
});
