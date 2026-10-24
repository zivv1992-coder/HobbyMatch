// ══════════════════════════════════════════════════════════════════════════════
// city-picker.js — Searchable city field (register + edit profile)
// Type a letter → list of cities starting with it, in א-ב order.
// The chosen city is written to a hidden <input> so existing `.value` reads work;
// it stays empty until a city from CITIES (config.js) is picked.
//
// Usage:
//   const picker = createCityPicker('f_city', 'tailwind classes for the text box');
//   picker.setCity('חיפה')
// ══════════════════════════════════════════════════════════════════════════════

function cp_escape(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function cp_injectStyles() {
  if (document.getElementById('cityPickerStyles')) return;
  const style = document.createElement('style');
  style.id = 'cityPickerStyles';
  style.textContent = `
    .cp-list {
      position: absolute; top: calc(100% + 4px); right: 0; left: 0; z-index: 50;
      max-height: 240px; overflow-y: auto; background: #fff;
      border: 1.5px solid #ddd6fe; border-radius: 12px;
      box-shadow: 0 8px 24px rgba(91,33,182,.15);
    }
    .cp-item { padding: 9px 14px; font-size: 14px; cursor: pointer; text-align: right; }
    .cp-item:hover, .cp-item.active { background: #f5f3ff; color: #5b21b6; }
    .cp-item b { color: #7c3aed; }
    .cp-empty { padding: 10px 14px; font-size: 13px; color: #9ca3af; }
  `;
  document.head.appendChild(style);
}

const CITY_NAMES_SORTED = CITIES.map(c => c.name).sort((a, b) => a.localeCompare(b, 'he'));

// Cities whose name starts with the query come first, then cities where
// another word starts with it ("ש" → שדרות … then באר שבע).
function cp_filter(query) {
  const q = query.trim();
  if (!q) return CITY_NAMES_SORTED;
  const starts = [], wordStarts = [];
  CITY_NAMES_SORTED.forEach(name => {
    if (name.startsWith(q)) starts.push(name);
    else if (name.split(/[\s-]+/).some(w => w.startsWith(q))) wordStarts.push(name);
  });
  return starts.concat(wordStarts);
}

function createCityPicker(hiddenId, inputClass) {
  cp_injectStyles();
  const hidden = document.getElementById(hiddenId);

  const wrap = document.createElement('div');
  wrap.style.position = 'relative';
  const input = document.createElement('input');
  input.type = 'text';
  input.autocomplete = 'off';
  input.placeholder = 'הקלד/י שם עיר...';
  input.className = inputClass;
  const list = document.createElement('div');
  list.className = 'cp-list';
  list.hidden = true;
  wrap.append(input, list);
  hidden.after(wrap);

  let matches = [];
  let activeIdx = -1;

  function render() {
    const q = input.value.trim();
    matches = cp_filter(q);
    if (!matches.length) {
      list.innerHTML = '<div class="cp-empty">לא נמצאה עיר</div>';
      return;
    }
    list.innerHTML = matches.map((name, i) => {
      const label = q && name.startsWith(q)
        ? `<b>${cp_escape(q)}</b>${cp_escape(name.slice(q.length))}`
        : cp_escape(name);
      return `<div class="cp-item${i === activeIdx ? ' active' : ''}" data-i="${i}">${label}</div>`;
    }).join('');
  }

  function open() {
    activeIdx = -1;
    render();
    list.hidden = false;
  }

  function close() {
    list.hidden = true;
    // Typed an exact city name without clicking it → accept it
    if (!hidden.value && CITY_NAMES_SORTED.includes(input.value.trim())) choose(input.value.trim());
  }

  function choose(name) {
    hidden.value = name;
    input.value = name;
    list.hidden = true;
  }

  input.addEventListener('focus', open);
  input.addEventListener('input', () => {
    hidden.value = '';
    open();
  });
  input.addEventListener('blur', close);
  input.addEventListener('keydown', e => {
    if (list.hidden) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!matches.length) return;
      activeIdx = e.key === 'ArrowDown'
        ? Math.min(activeIdx + 1, matches.length - 1)
        : Math.max(activeIdx - 1, 0);
      render();
      list.children[activeIdx]?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = matches[activeIdx >= 0 ? activeIdx : 0];
      if (pick) choose(pick);
    } else if (e.key === 'Escape') {
      list.hidden = true;
    }
  });
  // mousedown (not click) so the choice lands before the input's blur closes the list
  list.addEventListener('mousedown', e => {
    e.preventDefault();
    const item = e.target.closest('.cp-item');
    if (item) choose(matches[+item.dataset.i]);
  });

  return {
    setCity(name) {
      hidden.value = name || '';
      input.value = name || '';
    }
  };
}
