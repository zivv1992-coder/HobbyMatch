// ══════════════════════════════════════════════════════════════════════════════
// hobby-picker.js — Hierarchical hobby selection (register + edit profile)
// Category bubbles → sub-hobby pills, custom free-text hobbies, selected tags.
// Categories come from HOBBY_CATEGORIES in config.js.
//
// Usage:
//   const picker = createHobbyPicker('containerId', ['ריצה', 'צילום']);
//   picker.getHobbies()          → ['ריצה', 'צילום']
//   picker.setHobbies([...])
//   createHobbyPicker('id', [], { compact: true }) → chosen hobbies first; categories open on "+ הוספת תחביב"
// ══════════════════════════════════════════════════════════════════════════════

const HOBBY_PICKER_MAX     = 15;
const HOBBY_PICKER_MAX_LEN = 30;

function hp_escape(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function hp_injectStyles() {
  if (document.getElementById('hobbyPickerStyles')) return;
  const style = document.createElement('style');
  style.id = 'hobbyPickerStyles';
  style.textContent = `
    .hp-bubble {
      display: flex; align-items: center; gap: 6px; width: 100%;
      padding: 10px 12px; border-radius: 16px; font-size: 13px; font-weight: 700;
      color: #5b21b6; background: #fff; border: 1.5px solid #ddd6fe;
      transition: all .18s ease; text-align: right; line-height: 1.2;
    }
    .hp-bubble:hover { border-color: #a78bfa; background: #faf5ff; transform: translateY(-1px); }
    .hp-bubble.open {
      color: #fff; border-color: transparent;
      background: linear-gradient(135deg, #7c3aed, #6366f1);
      box-shadow: 0 0 0 3px rgba(167,139,250,.35), 0 6px 16px rgba(124,58,237,.35);
    }
    .hp-bubble .hp-count {
      margin-inline-start: auto; min-width: 20px; height: 20px; padding: 0 6px;
      border-radius: 9999px; font-size: 11px; display: inline-flex; align-items: center; justify-content: center;
      background: #7c3aed; color: #fff;
    }
    .hp-bubble.open .hp-count { background: #fff; color: #7c3aed; }
    .hp-subs { animation: hpFade .2s ease; }
    @keyframes hpFade { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: none; } }
    .hp-pill {
      padding: 6px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600;
      color: #6d28d9; background: #f5f3ff; border: 1.5px solid #ede9fe; transition: all .15s ease;
    }
    .hp-pill:hover { border-color: #c4b5fd; }
    .hp-pill.selected {
      color: #fff; background: #7c3aed; border-color: #7c3aed;
      box-shadow: 0 0 10px rgba(139,92,246,.5);
    }
    .hp-tag {
      display: inline-flex; align-items: center; gap: 4px;
      padding: 4px 6px 4px 10px; border-radius: 9999px; font-size: 13px; font-weight: 700;
      color: #5b21b6; background: linear-gradient(135deg, #f3e8ff, #e0e7ff);
      border: 1px solid #c4b5fd; box-shadow: 0 0 8px rgba(167,139,250,.45);
    }
    .hp-tag button {
      width: 18px; height: 18px; border-radius: 9999px; font-size: 12px; line-height: 1;
      display: inline-flex; align-items: center; justify-content: center;
      color: #7c3aed; background: rgba(255,255,255,.8);
    }
    .hp-tag button:hover { background: #7c3aed; color: #fff; }
  `;
  document.head.appendChild(style);
}

function createHobbyPicker(containerId, initial = [], { compact = false } = {}) {
  hp_injectStyles();
  const root = document.getElementById(containerId);
  let selected = [];
  let openCat  = -1;
  let adding   = !compact;   // compact: the category grid stays closed until asked for

  function catCount(cat) {
    return cat.items.filter(i => selected.includes(i)).length;
  }

  function showError(msg) {
    const el = root.querySelector('.hp-error');
    el.textContent = msg;
    el.classList.toggle('hidden', !msg);
  }

  function add(name) {
    const clean = name.replace(/\s+/g, ' ').trim().slice(0, HOBBY_PICKER_MAX_LEN);
    if (!clean || selected.includes(clean)) return true;
    if (selected.length >= HOBBY_PICKER_MAX) {
      showError(`אפשר לבחור עד ${HOBBY_PICKER_MAX} תחביבים`);
      return false;
    }
    selected.push(clean);
    return true;
  }

  function remove(name) {
    selected = selected.filter(h => h !== name);
  }

  function render() {
    const cats = HOBBY_CATEGORIES.map((cat, i) => {
      const n = catCount(cat);
      return `<button type="button" class="hp-bubble${i === openCat ? ' open' : ''}" data-cat="${i}">
        <span>${cat.emoji}</span><span>${hp_escape(cat.label)}</span>
        ${n ? `<span class="hp-count">${n}</span>` : ''}
      </button>`;
    }).join('');

    const subs = openCat >= 0 ? `
      <div class="hp-subs flex flex-wrap gap-2 bg-purple-50/60 border border-purple-100 rounded-2xl p-3">
        ${HOBBY_CATEGORIES[openCat].items.map(item => {
          const on = selected.includes(item);
          return `<button type="button" class="hp-pill${on ? ' selected' : ''}" data-item="${hp_escape(item)}">${on ? '✓ ' : ''}${hp_escape(item)}</button>`;
        }).join('')}
      </div>` : '';

    const tags = selected.length
      ? selected.map(h => `<span class="hp-tag">${hp_escape(h)}<button type="button" data-remove="${hp_escape(h)}" aria-label="הסר ${hp_escape(h)}">✕</button></span>`).join('')
      : '<span class="text-xs text-gray-400">עדיין לא נבחרו תחביבים — בחר/י קטגוריה למעלה</span>';

    const inputVal = root.querySelector('.hp-input')?.value || '';
    if (compact) {
      root.innerHTML = `
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">${selected.length ? selected.map(h => `<span class="hp-tag">${hp_escape(h)}<button type="button" data-remove="${hp_escape(h)}" aria-label="הסר ${hp_escape(h)}">✕</button></span>`).join('') : '<span class="text-xs text-gray-400">עוד אין</span>'}</div>
        ${adding ? `
        <div class="grid grid-cols-2 gap-2">${cats}</div>
        ${subs}
        <div class="flex gap-2">
          <input type="text" class="hp-input flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            maxlength="${HOBBY_PICKER_MAX_LEN}" placeholder="תחביב שלא ברשימה?"/>
          <button type="button" class="hp-add bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl px-4 transition">הוסף</button>
        </div>
        <button type="button" class="hp-toggle text-xs font-bold text-purple-600">סגירה ↑</button>` :
        '<button type="button" class="hp-toggle text-sm font-bold text-purple-700">+ הוספת תחביב</button>'}
        <p class="hp-error hidden text-xs text-red-500"></p>
      </div>`;
      const inp = root.querySelector('.hp-input');
      if (inp) inp.value = inputVal;
      return;
    }
    root.innerHTML = `
      <div class="space-y-3">
        <div class="grid grid-cols-2 gap-2">${cats}</div>
        ${subs}
        <div class="flex gap-2">
          <input type="text" class="hp-input flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
            maxlength="${HOBBY_PICKER_MAX_LEN}" placeholder="תחביב שלא ברשימה? הקלד/י כאן"/>
          <button type="button" class="hp-add bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold rounded-xl px-4 transition">הוסף</button>
        </div>
        <p class="hp-error hidden text-xs text-red-500"></p>
        <div>
          <p class="text-xs font-semibold text-gray-500 mb-1.5">התחביבים שלי (${selected.length})</p>
          <div class="flex flex-wrap gap-2">${tags}</div>
        </div>
      </div>`;
    root.querySelector('.hp-input').value = inputVal;
  }

  function addCustom() {
    const input = root.querySelector('.hp-input');
    showError('');
    const ok = input.value.split(',').every(add);
    if (ok) input.value = '';
    render();
    if (!ok) showError(`אפשר לבחור עד ${HOBBY_PICKER_MAX} תחביבים`);
    root.querySelector('.hp-input').focus();
  }

  root.addEventListener('click', e => {
    const bubble = e.target.closest('[data-cat]');
    const pill   = e.target.closest('[data-item]');
    const rm     = e.target.closest('[data-remove]');
    if (bubble) {
      const i = Number(bubble.dataset.cat);
      openCat = openCat === i ? -1 : i;
      render();
    } else if (pill) {
      const item = pill.dataset.item;
      let ok = true;
      if (selected.includes(item)) remove(item); else ok = add(item);
      render();
      if (!ok) showError(`אפשר לבחור עד ${HOBBY_PICKER_MAX} תחביבים`);
    } else if (rm) {
      remove(rm.dataset.remove);
      render();
    } else if (e.target.closest('.hp-toggle')) {
      adding = !adding;
      openCat = -1;
      render();
    } else if (e.target.closest('.hp-add')) {
      addCustom();
    }
  });

  root.addEventListener('keydown', e => {
    if (e.key === 'Enter' && e.target.classList.contains('hp-input')) {
      e.preventDefault();
      addCustom();
    }
  });

  function setHobbies(list) {
    selected = [];
    openCat  = -1;
    adding   = !compact;
    (list || []).forEach(add);
    render();
  }

  setHobbies(initial);
  return {
    getHobbies: () => [...selected],
    setHobbies
  };
}

// Reads a user's hobbies as an array — supports new `hobbies` field and legacy comma string.
// Legacy values like "📸 צילום" are stripped of emoji so they match the preset "צילום".
function getUserHobbies(user) {
  if (Array.isArray(user.hobbies) && user.hobbies.length) return [...user.hobbies];
  return (user.hobby || '').split(',')
    .map(h => h.replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}
