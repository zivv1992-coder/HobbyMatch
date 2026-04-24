// ══════════════════════════════════════════════════════════════════════════════
// profiles-utils.js — Shared utility functions used across all modules
// ══════════════════════════════════════════════════════════════════════════════

// Safely escape HTML then make URLs clickable, preserving newlines
function linkifyText(raw) {
  if (!raw) return '';
  const esc = raw
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return esc
    .replace(/(https?:\/\/[^\s<>"&]+)/g,
      url => `<a href="${url}" target="_blank" rel="noopener noreferrer"
                 style="color:#7c3aed;text-decoration:underline;word-break:break-all;">${url}</a>`)
    .replace(/\n/g, '<br>');
}

function showToast(msg = 'הפרופיל עודכן בהצלחה ✓', color = 'bg-green-600') {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  toast.className = `fixed bottom-6 left-1/2 -translate-x-1/2 text-white text-sm font-bold px-5 py-3 rounded-2xl shadow-xl z-50 flex items-center gap-2 ${color}`;
  toast.classList.remove('hiding');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.add('hiding');
    setTimeout(() => toast.classList.add('hidden'), 300);
  }, 3000);
}

function stripEmoji(str) {
  return str.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, '').trim().toLowerCase();
}

// "דן כהן" → "דן כ."
function formatAttendeeDisplay(fullName) {
  const parts = (fullName || '').trim().split(/\s+/);
  if (parts.length < 2) return parts[0] || '';
  return `${parts[0]} ${parts[parts.length - 1].charAt(0)}.`;
}

function getInitials(display) {
  const clean = (display || '').replace(/\.$/, '').trim();
  const parts = clean.split(/\s+/);
  return parts.map(p => p.charAt(0)).join('').slice(0, 2);
}

function formatEventDate(dateTime) {
  if (!dateTime) return '—';
  const d = dateTime.toDate ? dateTime.toDate() : new Date(dateTime);
  const date = d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit' });
  const time = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  return `${date} · ${time}`;
}

// hobbyObj = { tag: string, type: 'exact' | 'similar' }
function formatHobbyTag(hobbyObj) {
  if (!hobbyObj) return '';
  const prefix = hobbyObj.type === 'exact' ? 'תחביב: ' : 'דומה ל: ';
  return prefix + hobbyObj.tag;
}
