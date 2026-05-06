// ══════════════════════════════════════════════════════════════════════════════
// profiles-pwa.js — Service Worker registration + PWA install prompt logic
// ══════════════════════════════════════════════════════════════════════════════

let _deferredPrompt = null;
const _isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) && !window.MSStream;
const _isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

// ── Show install button in header ─────────────────────────────────────────────
function _showInstallBtn() {
  if (_isInStandaloneMode || localStorage.getItem('pwaInstalled')) return;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.classList.replace('hidden', 'flex');
}

// ── iOS: show on load ─────────────────────────────────────────────────────────
if (_isIOS) {
  window.addEventListener('load', _showInstallBtn);
}

// ── Capture install prompt ────────────────────────────────────────────────────
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  _deferredPrompt = e;
  if (!localStorage.getItem('pwaInstalled')) {
    _showInstallBtn();
    document.getElementById('pwaInstallBanner')?.classList.remove('hidden');
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
    document.getElementById('pwaInstallBtn')?.classList.replace('flex', 'hidden');
  }
  _deferredPrompt = null;
};

// ── Manual install (header button) ───────────────────────────────────────────
window.triggerPWAInstallManual = async () => {
  if (_isIOS) {
    showIOSInstallModal();
    return;
  }
  if (_deferredPrompt) {
    await window.triggerPWAInstall();
  } else {
    showIOSInstallModal(true);
  }
};

function showIOSInstallModal(isAndroid = false) {
  const existing = document.getElementById('pwaIOSModal');
  if (existing) { existing.remove(); return; }

  const modal = document.createElement('div');
  modal.id = 'pwaIOSModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:flex-end;justify-content:center;background:rgba(0,0,0,0.5)';
  const appPreviewHTML = `
    <div style="margin:0 0 16px;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 2px 12px rgba(76,29,149,0.10)">
      <div style="background:linear-gradient(135deg,#4c1d95,#6d28d9);padding:10px 14px;display:flex;align-items:center;gap:10px;direction:rtl">
        <img src="/icons/icon-192.png" style="width:32px;height:32px;border-radius:8px" onerror="this.style.display='none'"/>
        <span style="color:#fff;font-weight:900;font-size:1rem">קונקשן</span>
        <span style="color:#c4b5fd;font-size:0.75rem;margin-right:auto">מצא שותפים לתחביבים</span>
      </div>
      <div style="background:#f5f3ff;padding:12px 14px;direction:rtl">
        <div style="display:flex;gap:6px;margin-bottom:10px">
          <span style="background:#4c1d95;color:#fff;border-radius:20px;padding:4px 12px;font-size:0.75rem;font-weight:700">מי באזור</span>
          <span style="background:#fff;color:#6b7280;border-radius:20px;padding:4px 12px;font-size:0.75rem;border:1px solid #e5e7eb">אירועים</span>
          <span style="background:#fff;color:#6b7280;border-radius:20px;padding:4px 12px;font-size:0.75rem;border:1px solid #e5e7eb">קונקשנז'</span>
        </div>
        <div style="display:flex;gap:8px">
          <div style="flex:1;background:#fff;border-radius:12px;padding:10px;border:1px solid #ede9fe;text-align:right">
            <div style="width:36px;height:36px;background:#ddd6fe;border-radius:50%;margin:0 0 6px auto"></div>
            <p style="font-size:0.72rem;font-weight:700;color:#1e1b4b;margin:0">דן, 28</p>
            <p style="font-size:0.65rem;color:#7c3aed;margin:2px 0 0">🎸 גיטרה · תל אביב</p>
          </div>
          <div style="flex:1;background:#fff;border-radius:12px;padding:10px;border:1px solid #ede9fe;text-align:right">
            <div style="width:36px;height:36px;background:#ddd6fe;border-radius:50%;margin:0 0 6px auto"></div>
            <p style="font-size:0.72rem;font-weight:700;color:#1e1b4b;margin:0">שירה, 25</p>
            <p style="font-size:0.65rem;color:#7c3aed;margin:2px 0 0">🧘 יוגה · ירושלים</p>
          </div>
        </div>
      </div>
    </div>`;

  modal.innerHTML = `
    <div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 20px 32px;width:100%;max-width:480px;direction:rtl;font-family:Heebo,sans-serif">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <p style="font-size:1.1rem;font-weight:900;margin:0;color:#1e1b4b">📲 הוסף למסך הבית</p>
        <button onclick="document.getElementById('pwaIOSModal').remove()" style="font-size:1.4rem;background:none;border:none;cursor:pointer;color:#6b7280">✕</button>
      </div>
      ${appPreviewHTML}
      ${isAndroid ? `<p style="color:#6b7280;font-size:0.9rem;margin:0">פתח בדפדפן Chrome ← לחץ על תפריט ⋮ ← "הוסף למסך הבית".</p>` : `
      <ol style="padding-right:18px;margin:0;color:#374151;font-size:0.92rem;line-height:2">
        <li>לחץ על כפתור ⬆️ <strong>שתף</strong> בתחתית הדפדפן</li>
        <li>גלול ובחר <strong>הוסף למסך הבית</strong></li>
        <li>לחץ <strong>הוסף</strong> בפינה הימנית העליונה</li>
      </ol>`}
    </div>
  `;
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

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
    navigator.serviceWorker.register('/sw.js')
      .catch(err => console.warn('SW registration failed:', err));
  });
}
