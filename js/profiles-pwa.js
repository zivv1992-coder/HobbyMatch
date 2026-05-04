// ══════════════════════════════════════════════════════════════════════════════
// profiles-pwa.js — Service Worker registration + PWA install prompt logic
// ══════════════════════════════════════════════════════════════════════════════

let _deferredPrompt = null;

// ── Capture install prompt ────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  if (!localStorage.getItem('pwaInstalled')) {
    document.getElementById('pwaInstallBanner')?.classList.remove('hidden');
    // Show the education hint card once
    if (!localStorage.getItem('pwaHintShown')) {
      showPWAHint();
    }
  }
});

// ── Install button handler ────────────────────────────────────────────────────
window.triggerPWAInstall = async () => {
  if (!_deferredPrompt) return;
  _deferredPrompt.prompt();
  const { outcome } = await _deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    localStorage.setItem('pwaInstalled', '1');
    document.getElementById('pwaInstallBanner')?.classList.add('hidden');
    document.getElementById('pwaHintCard')?.classList.add('hidden');
  }
  _deferredPrompt = null;
};

// ── Dismiss banner ────────────────────────────────────────────────────────────
window.dismissPWABanner = () => {
  localStorage.setItem('pwaInstalled', '1');
  document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  document.getElementById('pwaHintCard')?.classList.add('hidden');
};

// ── After install: show shortcuts tip toast ───────────────────────────────────
window.addEventListener('appinstalled', () => {
  localStorage.setItem('pwaInstalled', '1');
  document.getElementById('pwaInstallBanner')?.classList.add('hidden');
  document.getElementById('pwaHintCard')?.classList.add('hidden');
  // Show shortcuts tip after a short delay
  setTimeout(showShortcutsTip, 1500);
});

// ── Education: install hint card (shown once) ─────────────────────────────────
function showPWAHint() {
  localStorage.setItem('pwaHintShown', '1');
  const card = document.getElementById('pwaHintCard');
  if (!card) return;
  card.classList.remove('hidden');
  setTimeout(() => card.classList.add('hidden'), 7000);
}

// ── Education: shortcuts tip toast (shown once after install) ─────────────────
function showShortcutsTip() {
  if (localStorage.getItem('shortcutsTipShown')) return;
  localStorage.setItem('shortcutsTipShown', '1');

  const tip = document.createElement('div');
  tip.id = 'shortcutsTipToast';
  tip.style.cssText = `
    position:fixed; bottom:80px; left:50%; transform:translateX(-50%);
    z-index:9999; width:calc(100% - 2rem); max-width:360px;
    background:linear-gradient(135deg,#4c1d95,#2563eb);
    box-shadow:0 0 20px 4px rgba(124,58,237,0.45);
    border-radius:16px; padding:14px 16px;
    display:flex; align-items:flex-start; gap:10px;
    color:#fff; font-family:'Heebo',sans-serif; direction:rtl;
    animation:toastIn 0.35s ease;
  `;
  tip.innerHTML = `
    <div style="font-size:1.4rem;line-height:1">📌</div>
    <div style="flex:1">
      <p style="font-weight:900;font-size:0.85rem;margin:0 0 2px">טיפ: קיצורי דרך מהאייקון</p>
      <p style="font-size:0.75rem;opacity:0.85;margin:0;line-height:1.4">
        לחץ לחיצה ארוכה על האייקון שלנו במסך הבית לגישה מהירה לשיחות, גילוי ופרופיל!
      </p>
    </div>
    <button onclick="this.parentElement.remove()" style="opacity:0.7;font-size:1.1rem;line-height:1;background:none;border:none;color:#fff;cursor:pointer;padding:0">✕</button>
  `;
  document.body.appendChild(tip);
  setTimeout(() => tip.remove(), 9000);
}

// ── Service Worker registration ───────────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/hobby-match/sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}
