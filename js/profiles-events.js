// ══════════════════════════════════════════════════════════════════════════════
// profiles-events.js — Full events system: load, render, create, join, parse
//
// ATMOSPHERE / VIBE TAGS
// ─────────────────────
// ATMOSPHERE_MAP (defined in config.js) maps activity tags → vibe chip options.
// Used in the Create Event form to let organizers tag the mood/style of an event.
// To add a new vibe category: edit ATMOSPHERE_MAP in config.js.
// To add new hobby keywords for auto-detection: edit extractHobbyFromText() below.
// ══════════════════════════════════════════════════════════════════════════════

let ev_selectedActivities = new Set();
let ev_selectedAtmosphere = new Set();
let ev_customActivityInput = null;

function evRenderActivityChips() {
  const container = document.getElementById('ev_activity_tags');
  if (!container) return;
  container.innerHTML = '';

  ACTIVITY_CATEGORIES.forEach(cat => {
    const selectedCount = cat.tags.filter(t => ev_selectedActivities.has(t)).length;
    const isExpanded    = ev_expandedCategories.has(cat.label);

    const catBtn = document.createElement('button');
    catBtn.type = 'button';
    catBtn.dataset.catLabel = cat.label;
    const badge = selectedCount > 0
      ? ` <span style="background:#7c3aed;color:#fff;border-radius:999px;padding:1px 7px;font-size:0.65rem;vertical-align:middle;margin-right:2px;">${selectedCount}</span>`
      : '';
    catBtn.innerHTML = `${cat.label}${badge}`;
    catBtn.className = selectedCount > 0
      ? 'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-purple-500 bg-purple-50 text-purple-800 transition cursor-pointer'
      : isExpanded
        ? 'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-purple-400 bg-purple-50 text-purple-700 shadow-sm transition cursor-pointer'
        : TAG_CHIP_INACTIVE_CLASS + ' cursor-pointer';

    catBtn.onclick = (e) => {
      e.stopPropagation();
      if (ev_expandedCategories.has(cat.label)) {
        ev_expandedCategories.delete(cat.label);
        _closeActivityPopover();
        evRenderActivityChips();
      } else {
        ev_expandedCategories.clear();
        ev_expandedCategories.add(cat.label);
        evRenderActivityChips();
        const newBtn = document.querySelector(`[data-cat-label="${cat.label}"]`);
        if (newBtn) _openActivityPopover(cat, newBtn);
      }
    };
    container.appendChild(catBtn);
  });

  // Show chips for custom (non-category) activities
  const allCategoryTags = ACTIVITY_CATEGORIES.flatMap(c => c.tags);
  [...ev_selectedActivities].filter(t => !allCategoryTags.includes(t)).forEach((tag, idx) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = getTagChipActiveClassByIndex(idx) + ' cursor-pointer';
    chip.innerHTML = `${tag} <span style="margin-right:4px;opacity:0.7;">✕</span>`;
    chip.onclick = (e) => {
      e.stopPropagation();
      ev_selectedActivities.delete(tag);
      evRenderActivityChips();
      evRefreshAtmosphereChips();
    };
    container.appendChild(chip);
  });

  const otherBtn = document.createElement('button');
  otherBtn.type = 'button';
  otherBtn.className = TAG_CHIP_INACTIVE_CLASS + ' cursor-pointer';
  otherBtn.innerHTML = '➕ אחר';
  otherBtn.onclick = (e) => {
    e.stopPropagation();
    ev_expandedCategories.clear();
    _openCustomActivityInput();
  };
  container.appendChild(otherBtn);
}

function _openActivityPopover(cat, anchorBtn) {
  _closeActivityPopover();

  const popover = document.createElement('div');
  popover.id = 'evActivityPopover';
  popover.style.cssText = `
    position:fixed;z-index:9999;
    background:#fff;
    border:1.5px solid #c4b5fd;
    border-radius:18px;
    padding:14px 14px 12px;
    box-shadow:0 12px 40px rgba(109,40,217,0.22),0 2px 8px rgba(0,0,0,0.08);
    display:flex;flex-wrap:wrap;gap:8px;
    max-width:300px;min-width:200px;
    direction:rtl;
    animation:popoverIn 0.18s cubic-bezier(.34,1.56,.64,1) both;
  `;

  if (!document.getElementById('_popoverKeyframes')) {
    const s = document.createElement('style');
    s.id = '_popoverKeyframes';
    s.textContent = `@keyframes popoverIn{from{opacity:0;transform:scale(0.88) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}`;
    document.head.appendChild(s);
  }

  // header label
  const hdr = document.createElement('div');
  hdr.style.cssText = 'width:100%;font-size:0.7rem;font-weight:700;color:#7c3aed;margin-bottom:4px;padding-bottom:6px;border-bottom:1px solid #ede9fe;';
  hdr.textContent = cat.label;
  popover.appendChild(hdr);

  cat.tags.forEach((tag, idx) => {
    const tagBtn = document.createElement('button');
    tagBtn.type = 'button';
    tagBtn.textContent = tag;
    const active = ev_selectedActivities.has(tag);
    tagBtn.className = active ? getTagChipActiveClassByIndex(idx) : TAG_CHIP_INACTIVE_CLASS;
    tagBtn.onclick = (e) => {
      e.stopPropagation();
      if (ev_selectedActivities.has(tag)) ev_selectedActivities.delete(tag);
      else ev_selectedActivities.add(tag);
      ev_expandedCategories.clear();
      _closeActivityPopover();
      evRenderActivityChips();
      evRefreshAtmosphereChips();
    };
    popover.appendChild(tagBtn);
  });

  // tiny stem arrow
  const stem = document.createElement('div');
  stem.style.cssText = `
    position:absolute;bottom:-8px;right:20px;
    width:14px;height:8px;overflow:hidden;
  `;
  stem.innerHTML = `<div style="width:14px;height:14px;background:#fff;border:1.5px solid #c4b5fd;transform:rotate(45deg);margin-top:-8px;border-radius:3px;box-shadow:2px 2px 6px rgba(109,40,217,0.12);"></div>`;
  popover.appendChild(stem);

  document.body.appendChild(popover);

  // position above the anchor button
  const rect = anchorBtn.getBoundingClientRect();
  const pw   = Math.min(300, window.innerWidth - 16);
  popover.style.width = pw + 'px';
  const ph = popover.offsetHeight;
  let top  = rect.top - ph - 12;
  let left = rect.right - pw;

  // if too high, flip below
  if (top < 8) { top = rect.bottom + 12; stem.style.bottom = 'auto'; stem.style.top = '-8px'; stem.style.transform = 'rotate(180deg)'; }
  if (left < 8) left = 8;
  if (left + pw > window.innerWidth - 8) left = window.innerWidth - pw - 8;

  popover.style.top  = top  + 'px';
  popover.style.left = left + 'px';

  setTimeout(() => document.addEventListener('click', _closeActivityPopoverHandler), 0);
}

function _closeActivityPopoverHandler(e) {
  const p = document.getElementById('evActivityPopover');
  if (p && !p.contains(e.target)) {
    ev_expandedCategories.clear();
    _closeActivityPopover();
    evRenderActivityChips();
  }
}

function _closeActivityPopover() {
  const p = document.getElementById('evActivityPopover');
  if (p) p.remove();
  document.removeEventListener('click', _closeActivityPopoverHandler);
}

function _openCustomActivityInput() {
  _closeActivityPopover();
  _closeCustomActivityInput();

  const inputDiv = document.createElement('div');
  inputDiv.id = 'evCustomActivityInput';
  inputDiv.style.cssText = `
    position:fixed;z-index:9999;top:50%;left:50%;transform:translate(-50%,-50%);
    background:#fff;border:1.5px solid #c4b5fd;border-radius:14px;
    padding:14px;box-shadow:0 8px 32px rgba(109,40,217,0.22);
    width:76%;max-width:256px;direction:rtl;
    animation:popoverIn 0.18s cubic-bezier(.34,1.56,.64,1) both;
  `;

  inputDiv.innerHTML = `
    <p style="font-size:0.78rem;font-weight:600;color:#374151;margin:0 0 8px;">סוג פעילות מותאם:</p>
    <input id="customActivityField" type="text" placeholder="למשל: סיור טבע, משחק לוח..."
      style="width:100%;border:1.5px solid #e5e7eb;border-radius:10px;padding:8px 10px;
             font-size:0.85rem;font-family:'Heebo',sans-serif;direction:rtl;text-align:right;
             outline:none;box-sizing:border-box;transition:border-color 0.15s;"
      onkeydown="if(event.key==='Enter') document.getElementById('customActivityBtn').click()"/>
    <div style="display:flex;gap:6px;margin-top:10px;">
      <button id="customActivityBtn" onclick="_addCustomActivity()"
        style="flex:1;background:#7c3aed;color:#fff;border:none;border-radius:10px;
               padding:8px;font-size:0.85rem;font-weight:700;cursor:pointer;transition:background 0.15s;"
        onmouseover="this.style.background='#6d28d9'" onmouseout="this.style.background='#7c3aed'">
        הוסף
      </button>
      <button onclick="_closeCustomActivityInput()"
        style="flex:1;background:#f3f4f6;color:#6b7280;border:none;border-radius:10px;
               padding:8px;font-size:0.85rem;font-weight:700;cursor:pointer;transition:background 0.15s;"
        onmouseover="this.style.background='#e5e7eb'" onmouseout="this.style.background='#f3f4f6'">
        ביטול
      </button>
    </div>
  `;

  document.body.appendChild(inputDiv);
  ev_customActivityInput = inputDiv;
  const field = document.getElementById('customActivityField');
  field.focus();
  setTimeout(() => document.addEventListener('click', _closeCustomActivityInputHandler), 0);
}

function _closeCustomActivityInputHandler(e) {
  const el = document.getElementById('evCustomActivityInput');
  if (el && !el.contains(e.target)) {
    _closeCustomActivityInput();
  }
}

function _closeCustomActivityInput() {
  const el = document.getElementById('evCustomActivityInput');
  if (el) el.remove();
  document.removeEventListener('click', _closeCustomActivityInputHandler);
  ev_customActivityInput = null;
}

function _addCustomActivity() {
  const field = document.getElementById('customActivityField');
  const value = (field?.value || '').trim();
  if (!value) {
    alert('אנא הזן סוג פעילות');
    field?.focus();
    return;
  }
  ev_selectedActivities.add(value);
  _closeCustomActivityInput();
  evRenderActivityChips();
  evRefreshAtmosphereChips();
}

function evRefreshAtmosphereChips() {
  const container = document.getElementById('ev_atmosphere_tags');
  const hint = document.getElementById('ev_atmosphere_hint');
  if (!container) return;

  const available = mergeAtmosphereOptionsForActivities([...ev_selectedActivities]);
  [...ev_selectedAtmosphere].forEach(t => {
    if (!available.includes(t)) ev_selectedAtmosphere.delete(t);
  });

  if (ev_selectedActivities.size === 0) {
    container.innerHTML = '';
    if (hint) {
      hint.textContent = 'בחרו לפחות סוג פעילות אחד כדי לראות כאן אפשרויות אווירה.';
      hint.classList.remove('hidden');
    }
    return;
  }
  if (hint) hint.classList.add('hidden');

  container.innerHTML = '';
  available.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tag;
    const idx = available.indexOf(tag);
    const active = ev_selectedAtmosphere.has(tag);
    btn.className = active ? getTagChipActiveClassByIndex(idx) : TAG_CHIP_INACTIVE_CLASS;
    btn.onclick = () => {
      if (ev_selectedAtmosphere.has(tag)) ev_selectedAtmosphere.delete(tag);
      else ev_selectedAtmosphere.add(tag);
      evRefreshAtmosphereChips();
    };
    container.appendChild(btn);
  });
}

// ── Event Detail Modal ────────────────────────────────────────────────────────
function openEventDetailModal(eventId) {
  const ev = allEventsData.find(e => e.id === eventId);
  if (!ev) return;

  let dateStr = '', timeStr = '';
  if (ev.dateTime) {
    const d = ev.dateTime.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime);
    dateStr = d.toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    timeStr = d.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  const orgName  = ev.organizerName  || ev.creatorName  || '';
  const waNum    = formatWhatsApp(ev.organizerPhone || ev.creatorPhone || '');
  const waValid  = waNum.length >= 11;

  const contactFooterHtml = `
    <div style="padding:16px 24px 20px;border-top:1.5px solid #ede9fe;flex-shrink:0;" dir="rtl">
      ${orgName ? `<p style="font-size:0.8rem;color:#6b7280;text-align:center;margin:0 0 12px;">
        יוזם האירוע: <strong style="color:#5b21b6;">${orgName}</strong></p>` : ''}
      ${waValid
        ? `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer"
            style="display:flex;align-items:center;justify-content:center;gap:8px;
                   background:#25D366;color:#fff;font-weight:700;font-size:0.95rem;
                   padding:13px;border-radius:14px;text-decoration:none;"
            onmouseover="this.style.opacity='0.88'" onmouseout="this.style.opacity='1'">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            צור קשר עם היוזם
          </a>`
        : (orgName ? `<p style="text-align:center;font-size:0.78rem;color:#9ca3af;">לא הוזנו פרטי קשר ליוזם</p>` : '')}
    </div>`;

  const linksHtml = (ev.actionLinks && ev.actionLinks.length)
    ? `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;">
        ${ev.actionLinks.map(link => {
          const s = link.type === 'whatsapp_group' || link.type === 'whatsapp'
            ? 'background:#e8fdf0;color:#128C7E;border-color:#c3efd6;'
            : link.type === 'maps' ? 'background:#eff6ff;color:#1d4ed8;border-color:#bfdbfe;'
            : link.type === 'waze' ? 'background:#f0f9ff;color:#0369a1;border-color:#bae6fd;'
            : 'background:#f9fafb;color:#374151;border-color:#e5e7eb;';
          const icon = link.type.includes('whatsapp') ? '💬'
            : link.type === 'maps' ? '📍' : link.type === 'waze' ? '🚗' : '🔗';
          return `<a href="${link.url}" target="_blank" rel="noopener noreferrer"
            style="display:inline-flex;align-items:center;gap:6px;font-size:0.8rem;font-weight:700;
                   padding:6px 14px;border-radius:10px;border:1px solid;${s}text-decoration:none;">
            ${icon} ${link.label}</a>`;
        }).join('')}
      </div>` : '';

  const interested = ev.interested || [];
  const iAmIn      = me && interested.some(i => i.email === me.email);
  const visible    = interested.slice(0, 5);
  const extra      = interested.length > 5 ? interested.length - 5 : 0;
  const circlesHtml = visible.length
    ? `<div class="attendee-stack">
        ${[...visible].reverse().map((p, idx) => {
          const color = CIRCLE_COLORS[idx % CIRCLE_COLORS.length];
          const dp    = p.display || formatAttendeeDisplay(p.name || '');
          const parts = dp.split(' ');
          return `<div class="attendee-circle w-11 h-11 rounded-full bg-gradient-to-br ${color}
                       flex flex-col items-center justify-center text-white font-bold
                       border-2 border-white shrink-0" title="${dp}" style="line-height:1.15;">
                    <span style="font-size:10px;max-width:38px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${parts[0]||''}</span>
                    ${parts[1] ? `<span style="font-size:9px;">${parts[1]}</span>` : ''}
                  </div>`;
        }).join('')}
      </div>
      ${extra > 0 ? `<span style="font-size:0.7rem;color:#9ca3af;font-weight:600;">+${extra}</span>` : ''}
      <span style="font-size:0.73rem;color:#9ca3af;">${interested.length} הצטרפו</span>`
    : '';


  const eventAtmosphereBlock = (ev.atmosphereTags && ev.atmosphereTags.length)
    ? `<div style="margin-bottom:16px;">
        <p style="font-size:0.7rem;font-weight:700;color:#9ca3af;margin:0 0 8px;letter-spacing:0.04em;">אווירת מפגש</p>
        <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">${formatColoredTagBadgesHtml(ev.atmosphereTags)}</div>
      </div>`
    : '';

  const descSectionHtml = `
    <div class="ev-modal-scroll" style="flex:1;overflow-y:auto;padding:20px 24px;scrollbar-width:thin;scrollbar-color:#ddd6fe transparent;" dir="rtl">
      ${linksHtml}
      ${eventAtmosphereBlock}
      ${ev.description ? `
      <div>
        <p style="font-size:0.7rem;font-weight:700;color:#9ca3af;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">תיאור האירוע</p>
        <div style="font-size:0.93rem;color:#374151;line-height:1.85;">${linkifyText(ev.description)}</div>
      </div>` : ''}
    </div>`;

  const attendeesBlockHtml = interested.length > 0 ? `
    <div style="padding:12px 24px 16px;border-top:1px solid #f3f4f6;flex-shrink:0;" dir="rtl">
      <p style="font-size:0.7rem;font-weight:700;color:#9ca3af;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">משתתפים</p>
      <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">${circlesHtml}</div>
    </div>` : '';

  const existing = document.getElementById('eventDetailOverlay');
  if (existing) existing.remove();

  const isMobile = window.innerWidth < 640;
  const overlay  = document.createElement('div');
  overlay.id = 'eventDetailOverlay';
  overlay.style.cssText = `position:fixed;inset:0;z-index:60;display:flex;
    align-items:${isMobile ? 'flex-end' : 'center'};justify-content:center;
    padding:${isMobile ? '0' : '16px'};background:rgba(0,0,0,0.52);`;

  const boxRadius = isMobile ? '20px 20px 0 0' : '20px';

  overlay.innerHTML = `
    <div id="evDetailBox" style="background:#fff;width:100%;max-width:800px;max-height:${isMobile ? '92vh' : '90vh'};
                display:flex;flex-direction:column;border:1.5px solid #c4b5fd;
                border-radius:${boxRadius};box-shadow:0 12px 60px rgba(109,40,217,0.18);
                font-family:'Heebo',sans-serif;overflow:hidden;transform:translateZ(0);" onclick="event.stopPropagation()">

      <!-- Title bar -->
      <div style="display:flex;align-items:flex-start;justify-content:space-between;
                  padding:20px 24px 16px;border-bottom:1.5px solid #ede9fe;flex-shrink:0;" dir="rtl">
        <div style="flex:1;padding-left:14px;">
          <h2 style="font-size:1.25rem;font-weight:900;color:#3b0764;line-height:1.3;margin:0 0 8px;">${ev.title || ''}</h2>
          ${ev.detectedHobbyTag
            ? `<span style="display:inline-flex;align-items:center;font-size:0.72rem;font-weight:600;
                            color:#6d28d9;border:1px solid #7c3aed;border-radius:999px;
                            padding:3px 10px;background:transparent;">${formatHobbyTag(ev.detectedHobbyTag)}</span>`
            : ''}
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <a href="${(() => {
              const shareUrl = new URL('profiles.html?event=' + ev.id, window.location.href).href;
              const text = encodeURIComponent('בואו לראות פעילות בקונקשן: ' + (ev.title || '') + ' — ' + shareUrl);
              return 'https://wa.me/?text=' + text;
            })()}"
             target="_blank" rel="noopener noreferrer" title="שתף עם חברים באמצעות WhatsApp"
             style="display:inline-flex;align-items:center;gap:6px;font-size:0.78rem;font-weight:700;
                    padding:6px 14px;border-radius:999px;background:#e8fdf0;color:#128C7E;
                    border:1px solid #c3efd6;text-decoration:none;white-space:nowrap;transition:background 0.15s;"
             onmouseover="this.style.background='#c3efd6'" onmouseout="this.style.background='#e8fdf0'">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            שתף עם חברים
          </a>
          ${me && ev.createdBy === me.email ? `
          <button onclick="handleDeleteEvent('${ev.id}')"
            style="background:none;border:1px solid #fca5a5;border-radius:8px;font-size:0.75rem;font-weight:700;
                   color:#ef4444;cursor:pointer;padding:4px 10px;white-space:nowrap;"
            onmouseover="this.style.background='#fef2f2'" onmouseout="this.style.background='none'">
            🗑️ מחק
          </button>` : ''}
          <button onclick="closeEventDetailModal()"
            style="background:none;border:none;font-size:1.3rem;color:#9ca3af;cursor:pointer;line-height:1;padding:3px 0 0;"
            onmouseover="this.style.color='#7c3aed'" onmouseout="this.style.color='#9ca3af'">✕</button>
        </div>
      </div>

      <!-- Date / time / location -->
      <div style="padding:14px 24px;border-bottom:1.5px solid #f3f4f6;flex-shrink:0;display:flex;flex-direction:column;gap:9px;" dir="rtl">
        ${dateStr ? `<div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;color:#374151;"><span>📅</span><span style="font-weight:500;">${dateStr}</span></div>` : ''}
        ${timeStr ? `<div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;color:#374151;"><span>⏰</span><span style="font-weight:500;">${timeStr}</span></div>` : ''}
        ${ev.location
          ? (me
            ? `<div style="display:flex;align-items:center;gap:10px;font-size:0.9rem;color:#374151;">
                 <span>📍</span>
                 <span style="font-weight:500;flex:1;">${ev.location}</span>
                 <a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(ev.location)}"
                    target="_blank" rel="noopener noreferrer"
                    style="display:inline-flex;align-items:center;gap:5px;font-size:0.75rem;font-weight:700;
                           padding:5px 12px;border-radius:999px;background:#eff6ff;color:#1d4ed8;
                           border:1px solid #bfdbfe;text-decoration:none;white-space:nowrap;flex-shrink:0;"
                    onmouseover="this.style.background='#dbeafe'" onmouseout="this.style.background='#eff6ff'">
                   🗺️ נווט לאירוע
                 </a>
               </div>`
            : `<div style="display:flex;align-items:center;gap:10px;font-size:0.85rem;color:#6b7280;">
                 <span>📍</span>
                 <span style="font-weight:500;">${ev.location}</span>
                 <span style="font-size:0.72rem;color:#9ca3af;background:#f3f4f6;padding:2px 8px;border-radius:999px;white-space:nowrap;">מיקום כללי</span>
               </div>`)
          : ''}
      </div>

      ${!me
        ? `${descSectionHtml}
           ${attendeesBlockHtml}
           <div style="padding:16px 24px 22px;flex-shrink:0;display:flex;flex-direction:column;gap:10px;" dir="rtl">
             <div style="background:#faf5ff;border:1px solid #e9d5ff;border-radius:14px;padding:14px 16px;font-size:0.85rem;color:#7c3aed;font-weight:600;text-align:center;">
               🔒 פרטי הקשר וכפתור הצטרפות זמינים לאחר כניסה
             </div>
             <a href="index.html?returnTo=${encodeURIComponent(new URL('profiles.html?event=' + ev.id, window.location.href).href)}"
                style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
                       background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;
                       font-family:'Heebo',sans-serif;font-size:1.05rem;font-weight:800;
                       padding:16px;border-radius:16px;text-decoration:none;
                       box-shadow:0 4px 22px rgba(124,58,237,0.28);">
               <span style="font-size:1.2rem;">🔑</span> כנס להצטרפות לאירוע
             </a>
           </div>`

        : iAmIn
        ? `${descSectionHtml}
           ${attendeesBlockHtml}
           <div style="padding:12px 24px;border-top:1px solid #f3f4f6;flex-shrink:0;" dir="rtl">
             <div style="display:inline-flex;align-items:center;gap:6px;background:#f0fdf4;border:1px solid #bbf7d0;
                         border-radius:999px;padding:5px 14px;font-size:0.8rem;font-weight:700;color:#16a34a;">
               ✓ כבר הצטרפת לאירוע
             </div>
           </div>
           ${contactFooterHtml}`

        : `${descSectionHtml}
           ${attendeesBlockHtml
             ? attendeesBlockHtml
             : `<div style="padding:8px 24px 12px;flex-shrink:0;" dir="rtl"><span style="font-size:0.78rem;color:#9ca3af;">אף אחד עדיין — היה הראשון!</span></div>`}
           <div style="padding:12px 24px 20px;flex-shrink:0;" dir="rtl">
             <button id="evInterestCta" onclick="handleModalInterest('${ev.id}', this)"
               style="width:100%;display:flex;align-items:center;justify-content:center;gap:10px;
                      background:linear-gradient(135deg,#7c3aed,#2563eb);color:#fff;
                      font-family:'Heebo',sans-serif;font-size:1.08rem;font-weight:800;
                      padding:17px;border-radius:16px;border:none;cursor:pointer;
                      box-shadow:0 4px 22px rgba(124,58,237,0.32);letter-spacing:0.01em;
                      transition:opacity 0.15s,transform 0.1s;"
               onmouseover="this.style.opacity='0.9'" onmouseout="this.style.opacity='1'"
               onmousedown="this.style.transform='scale(0.98)'" onmouseup="this.style.transform='scale(1)'">
               <span style="font-size:1.35rem;">🙋</span> אני מתעניין באירוע
             </button>
           </div>
           <div id="evDetailsReveal" style="display:none;flex-direction:column;flex-shrink:0;opacity:0;transform:translateY(-6px);transition:opacity 0.38s ease,transform 0.38s ease;">
           </div>`
      }
    </div>`;

  overlay.addEventListener('click', closeEventDetailModal);
  document.body.appendChild(overlay);
}

async function handleModalInterest(eventId, btn) {
  btn.disabled = true;
  btn.innerHTML = '<span style="font-size:1.2rem;">⏳</span> מצטרף...';

  try {
    const ref  = db.collection('events').doc(eventId);
    const snap = await ref.get();
    let list   = [...(snap.data().interested || [])];

    if (!list.some(i => i.email === me.email)) {
      const display = formatAttendeeDisplay(me.fullName || me.email);
      list.push({ email: me.email, name: me.fullName || '', display });
      await ref.update({ interested: list });
      const ev = allEventsData.find(e => e.id === eventId);
      if (ev) ev.interested = list;
      renderEventsGrid();
    }

    btn.innerHTML = '<span style="font-size:1.2rem;">✓</span> הצטרפת!';
    btn.style.background   = 'linear-gradient(135deg,#16a34a,#059669)';
    btn.style.boxShadow    = '0 4px 20px rgba(22,163,74,0.28)';
    btn.style.marginBottom = '0';
    btn.disabled = false;

    const revealEl = document.getElementById('evDetailsReveal');
    if (revealEl) {
      revealEl.style.display = 'flex';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        revealEl.style.opacity   = '1';
        revealEl.style.transform = 'translateY(0)';
      }));
    }

    showToast('הצטרפת לאירוע! 🎉', 'bg-purple-600');
  } catch (err) {
    showToast('שגיאה. נסה שוב.', 'bg-red-600');
    console.error(err);
    btn.disabled = false;
    btn.innerHTML = '<span style="font-size:1.35rem;">🙋</span> אני מתעניין באירוע';
  }
}

function closeEventDetailModal() {
  const el = document.getElementById('eventDetailOverlay');
  if (el) el.remove();
}

async function handleDeleteEvent(eventId) {
  if (!confirm('למחוק את האירוע?')) return;
  try {
    await db.collection('events').doc(eventId).delete();
    allEventsData = allEventsData.filter(e => e.id !== eventId);
    closeEventDetailModal();
    renderEventsGrid();
    showToast('האירוע נמחק', 'bg-gray-600');
  } catch (e) {
    showToast('שגיאה במחיקה', 'bg-red-500');
    console.error(e);
  }
}

// ── Load events ───────────────────────────────────────────────────────────────
async function loadEvents() {
  if (eventsLoaded) { renderEventsGrid(); return; }

  const loadEl = document.getElementById('loadingEvents');
  const gridEl = document.getElementById('eventsGrid');
  loadEl.classList.remove('hidden');
  gridEl.classList.add('hidden');

  try {
    const snap    = await db.collection('events').orderBy('dateTime').get();
    allEventsData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    eventsLoaded  = true;
    loadEl.classList.add('hidden');
    gridEl.classList.remove('hidden');
    renderEventsGrid();
    const _deepLink = new URLSearchParams(window.location.search).get('event');
    if (_deepLink) {
      const _target = allEventsData.find(e => e.id === _deepLink);
      if (_target) openEventDetailModal(_deepLink);
    }
  } catch (err) {
    loadEl.innerHTML = '<p class="text-red-400 font-semibold">שגיאה בטעינת האירועים. רענן את הדף.</p>';
    console.error(err);
  }
}

// ── Filter buttons ────────────────────────────────────────────────────────────
function setEventFilter(filter) {
  eventFilter = filter;
  document.getElementById('evtFilterAll').classList.toggle('active',  filter === 'all');
  document.getElementById('evtFilterMine').classList.toggle('active', filter === 'mine');
  renderEventsGrid();
}

// ── Match user's hobbies against event hobby ──────────────────────────────────
function eventMatchesUser(ev) {
  if (!me) return false;
  const userKeywords = (me.hobby || '').split(',').map(h => stripEmoji(h)).filter(Boolean);
  const evHobbies    = (ev.associatedHobbies && ev.associatedHobbies.length)
    ? ev.associatedHobbies.map(h => stripEmoji(h))
    : [stripEmoji(ev.hobby || '')].filter(Boolean);
  return userKeywords.some(k => evHobbies.some(eh => eh.includes(k) || k.includes(eh)));
}

// ── Render the events grid ────────────────────────────────────────────────────
function renderEventsGrid() {
  const gridEl = document.getElementById('eventsGrid');
  const now    = new Date();

  let events = allEventsData.filter(ev =>
    eventMatchesUser(ev) ||
    (ev.interested || []).some(i => (i.email || i) === me?.email)
  );

  if (eventFilter === 'mine') {
    events = events.filter(ev =>
      ev.createdBy === me?.email ||
      (ev.interested || []).some(i => (i.email || i) === me?.email)
    );
  }

  events.sort((a, b) => {
    const aT    = a.dateTime ? (a.dateTime.toDate ? a.dateTime.toDate() : new Date(a.dateTime)) : new Date(0);
    const bT    = b.dateTime ? (b.dateTime.toDate ? b.dateTime.toDate() : new Date(b.dateTime)) : new Date(0);
    const aPast = aT < now ? 1 : 0;
    const bPast = bT < now ? 1 : 0;
    if (aPast !== bPast) return aPast - bPast;
    return aT - bT;
  });

  if (events.length === 0) {
    if (eventFilter === 'mine') {
      gridEl.innerHTML = `<div class="text-center py-16 text-gray-400"><div class="text-5xl mb-4">📋</div><p class="text-lg font-semibold">עדיין לא הצטרפת לאירועים</p><p class="text-sm mt-2">מצא אירוע מעניין ולחץ "הצטרף לאירוע"!</p></div>`;
    } else {
      gridEl.innerHTML = `
        <div class="text-center py-16 text-gray-400">
          <div class="text-5xl mb-4">🔍</div>
          <p class="text-lg font-semibold mb-2">אין כרגע אירועים בתחביבים שלך</p>
          <p class="text-sm leading-relaxed mb-5">אולי זה זמן טוב לגלות תחביב חדש?<br/>עדכן את הפרופיל שלך עם תחביבים נוספים כדי לראות יותר אירועים.</p>
          <div class="flex flex-col sm:flex-row gap-2 justify-center">
            <button onclick="openEditDrawer()" class="text-sm font-bold text-blue-700 border border-blue-200 px-4 py-2 rounded-xl hover:bg-blue-50 transition">✏️ עדכן את התחביבים שלי</button>
          </div>
        </div>`;
    }
    return;
  }

  gridEl.innerHTML = events.map(ev => renderEventCard(ev)).join('');
}

// ── Event card HTML ───────────────────────────────────────────────────────────
function renderEventCard(ev) {
  const interested   = ev.interested || [];
  const iAmIn        = interested.some(i => i.email === me.email);
  const now          = new Date();
  const evDate       = ev.dateTime ? (ev.dateTime.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime)) : null;
  const isPast       = evDate && evDate < now;
  const isMatch      = eventMatchesUser(ev);
  const calendarLink = generateGoogleCalendarLink(ev);

  let dateStr = '', timeStr = '';
  if (evDate) {
    dateStr = evDate.toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'long' });
    timeStr = evDate.toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' });
  }

  const visible = interested.slice(0, 5);
  const extra   = interested.length > 5 ? interested.length - 5 : 0;
  const circlesHtml = visible.length > 0
    ? `<div style="display:flex;">
        ${[...visible].reverse().map((p, idx) => {
          const color       = CIRCLE_COLORS[idx % CIRCLE_COLORS.length];
          const displayText = p.display || formatAttendeeDisplay(p.name || '');
          const parts       = displayText.split(' ');
          return `<div class="w-11 h-11 rounded-full bg-gradient-to-br ${color}
                       flex flex-col items-center justify-center text-white font-bold
                       border-2 border-white shrink-0 overflow-hidden"
                    style="line-height:1.15;margin-right:-10px;" title="${displayText}">
                    <span style="font-size:10px;max-width:38px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${parts[0]||''}</span>
                    ${parts[1] ? `<span style="font-size:9px;">${parts[1]}</span>` : ''}
                  </div>`;
        }).join('')}
      </div>
      ${extra > 0 ? `<span class="text-xs text-gray-400 font-semibold" style="margin-right:4px;">+${extra}</span>` : ''}
      <span class="text-xs text-gray-500" style="margin-right:6px;">${interested.length} הצטרפו</span>`
    : `<span class="text-xs text-gray-400">היה הראשון להצטרף!</span>`;

  const btnClass = iAmIn
    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-red-50 hover:text-red-500 hover:border-red-200'
    : 'bg-gradient-to-l from-purple-700 to-blue-600 text-white hover:opacity-90';
  const btnText  = iAmIn ? '✓ הצטרפת · לחץ לביטול' : 'הצטרף 🙋';

  let waSection = '';
  if (iAmIn && !isPast) {
    const phone  = ev.creatorPhone || '';
    const waNum  = formatWhatsApp(phone);
    const waLink = waNum.length >= 11
      ? `<a href="https://wa.me/${waNum}" target="_blank" rel="noopener noreferrer" dir="rtl"
            class="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-bold text-sm py-2.5 rounded-2xl hover:bg-[#1ebe5d] transition">
           <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
           שלח הודעה ליוצר${ev.creatorName ? ' — ' + ev.creatorName : ''} בוואטסאפ
         </a>`
      : `<p class="text-center text-xs text-gray-400 py-1">🙋 הצטרפת! ניתן לפנות ליוצר דרך הפרופיל שלו.</p>`;
    waSection = `<div>${waLink}</div>`;
  }

  const hobbyTags = ((ev.associatedHobbies && ev.associatedHobbies.length)
    ? ev.associatedHobbies : [ev.hobby || '🎯 כללי']
  ).map(h => `<span class="text-xs font-bold bg-violet-100 text-violet-700 px-2.5 py-1 rounded-full">${h}</span>`).join('');

  const matchBadge = isMatch
    ? `<span class="text-xs font-bold bg-amber-50 text-amber-600 border border-amber-200 px-2.5 py-1 rounded-full match-badge">✨ מתאים לך</span>`
    : '';
  const pastBadge = isPast
    ? `<span class="text-xs bg-gray-100 text-gray-500 px-2.5 py-1 rounded-full font-semibold">הסתיים</span>`
    : '';

  const atmosphereRow = (ev.atmosphereTags && ev.atmosphereTags.length)
    ? `<div class="flex flex-wrap gap-1.5 items-center">${formatColoredTagBadgesHtml(ev.atmosphereTags)}</div>`
    : '';

  const actionLinksHtml = (ev.actionLinks && ev.actionLinks.length > 0) ? `
    <div class="flex flex-wrap gap-2">
      ${ev.actionLinks.map(link => {
        const styles = link.type === 'whatsapp_group' || link.type === 'whatsapp'
          ? 'bg-[#e8fdf0] text-[#128C7E] border-[#c3efd6] hover:bg-[#d5f5e3]'
          : link.type === 'maps' ? 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
          : link.type === 'waze' ? 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100'
          : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100';
        const icon = link.type === 'whatsapp_group' || link.type === 'whatsapp' ? '💬'
          : link.type === 'maps' ? '📍' : link.type === 'waze' ? '🚗' : '🔗';
        return `<a href="${link.url}" target="_blank" rel="noopener noreferrer"
          class="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl border transition ${styles}">
          ${icon} ${link.label}
        </a>`;
      }).join('')}
    </div>` : '';

  return `
    <div class="bg-white rounded-[28px] overflow-hidden ${isPast ? 'opacity-70' : ''}"
         style="box-shadow:0 10px 40px rgba(139,92,246,0.08);cursor:pointer;"
         onclick="if(!event.target.closest('a,button')) openEventDetailModal('${ev.id}')">

      ${ev.imageUrl ? `
      <div class="relative w-full h-44 overflow-hidden">
        <img src="${ev.imageUrl}" class="w-full h-full object-cover" alt="${ev.title || ''}"/>
        <div class="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent"></div>
        <div class="absolute bottom-3 right-4 flex flex-wrap gap-1.5 items-center">${hobbyTags}${matchBadge}${pastBadge}</div>
      </div>` : ''}

      <div class="p-5 flex flex-col gap-4">
        ${!ev.imageUrl ? `<div class="flex flex-wrap gap-1.5 items-center">${hobbyTags}${matchBadge}${pastBadge}</div>` : ''}

        <div>
          <h3 class="font-black text-purple-900 text-lg leading-snug">${ev.title || ''}</h3>
          ${ev.detectedHobbyTag ? `
          <span style="display:inline-flex;align-items:center;font-size:0.72rem;font-weight:600;color:#6d28d9;border:1px solid #7c3aed;border-radius:999px;padding:2px 10px;background:transparent;margin-top:4px;">
            ${formatHobbyTag(ev.detectedHobbyTag)}
          </span>` : ''}
        </div>

        <div class="grid grid-cols-3 gap-2">
          ${dateStr ? `<div class="bg-violet-50 rounded-2xl p-3 flex flex-col gap-0.5"><span class="text-[10px] font-bold text-violet-400 uppercase tracking-wide">מתי</span><span class="text-xs font-bold text-gray-800 leading-tight">${dateStr}</span>${timeStr ? `<span class="text-xs font-semibold text-violet-600">${timeStr}</span>` : ''}</div>` : ''}
          ${ev.location ? `<div class="bg-violet-50 rounded-2xl p-3 flex flex-col gap-0.5"><span class="text-[10px] font-bold text-violet-400 uppercase tracking-wide">איפה</span><span class="text-xs font-bold text-gray-800 leading-tight line-clamp-2">${ev.location}</span></div>` : ''}
          ${(ev.organizerName || ev.creatorName) ? `<div class="bg-violet-50 rounded-2xl p-3 flex flex-col gap-0.5"><span class="text-[10px] font-bold text-violet-400 uppercase tracking-wide">מארגן</span><span class="text-xs font-bold text-gray-800 leading-tight line-clamp-2">${ev.organizerName || ev.creatorName || ''}</span></div>` : ''}
        </div>

        ${atmosphereRow ? `<div><p class="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">אווירת מפגש</p>${atmosphereRow}</div>` : ''}

        ${ev.description ? `<p class="text-sm text-gray-500 leading-relaxed line-clamp-2">${ev.description}</p>` : ''}
        ${actionLinksHtml}

        <div class="flex items-center justify-between pt-3 border-t border-gray-50 flex-wrap gap-3">
          <div class="flex items-center gap-2 flex-wrap">${circlesHtml}</div>
          <div class="flex items-center gap-2">
            ${!isPast ? `
              <a href="${calendarLink}" target="_blank" rel="noopener noreferrer" title="הוסף ליומן Google"
                class="text-xs font-bold px-3 py-2 rounded-xl transition bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100">
                📅 יומן
              </a>
              <button class="text-sm font-bold px-4 py-2 rounded-xl transition whitespace-nowrap ${btnClass}"
                onclick="handleInterest('${ev.id}', this)" data-interested="${iAmIn}">
                ${btnText}
              </button>` : `
              <button onclick="openRepeatEvent('${ev.id}')"
                class="text-sm font-bold px-3 py-2 rounded-xl transition bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100">
                🔁 ארגן שוב
              </button>`}
          </div>
        </div>

        ${isPast && iAmIn ? `
        <button onclick="openPostEventModal('${ev.id}', this)"
          data-ev-title="${(ev.title||'').replace(/"/g,'&quot;')}"
          class="w-full text-sm font-semibold text-gray-400 border border-dashed border-gray-200 py-2.5 rounded-2xl hover:bg-gray-50 hover:text-purple-600 hover:border-purple-200 transition">
          🙌 שתף את החוויה שלך מהאירוע הזה
        </button>` : ''}

        ${waSection}
      </div>
    </div>`;
}

// ── Toggle interest (join / leave) ────────────────────────────────────────────
async function handleInterest(eventId, btn) {
  const wasIn = btn.dataset.interested === 'true';
  btn.disabled = true;
  btn.textContent = '...';

  try {
    const ref = db.collection('events').doc(eventId);
    const doc = await ref.get();
    let interested = [...(doc.data().interested || [])];

    if (wasIn) {
      interested = interested.filter(i => i.email !== me.email);
    } else {
      const display = formatAttendeeDisplay(me.fullName || me.email);
      interested.push({ email: me.email, name: me.fullName || '', display });
    }

    await ref.update({ interested });
    const ev = allEventsData.find(e => e.id === eventId);
    if (ev) ev.interested = interested;
    renderEventsGrid();
  } catch (err) {
    showToast('שגיאה. נסה שוב.', 'bg-red-600');
    console.error(err);
    btn.disabled = false;
    btn.textContent = wasIn ? '✓ הצטרפת · לחץ לביטול' : 'הצטרף לאירוע 🙋';
  }
}

// ── Create event form ─────────────────────────────────────────────────────────
function openCreateEventModal() {
  const now    = new Date();
  const offset = now.getTimezoneOffset();
  const local  = new Date(now.getTime() - offset * 60000);
  document.getElementById('ev_datetime').min = local.toISOString().slice(0, 16);

  window._organizerType = null;
  ['org_btn_self', 'org_btn_other'].forEach(id => {
    const btn = document.getElementById(id);
    btn.classList.remove('border-purple-600', 'bg-purple-50', 'shadow-md');
    btn.classList.add('border-gray-200', 'bg-white');
    btn.querySelector('span:last-child').classList.remove('text-purple-700');
    btn.querySelector('span:last-child').classList.add('text-gray-600');
  });
  document.getElementById('ev_form_body').classList.add('hidden');
  document.getElementById('ev_footer').classList.add('hidden');

  ['ev_title','ev_desc','ev_datetime','ev_location','ev_hobbies','ev_organizer_name','ev_organizer_phone','ev_paste_text'].forEach(id => {
    document.getElementById(id).value = '';
  });
  document.getElementById('ev_paste_section').classList.add('hidden');
  document.getElementById('ev_links_preview').classList.add('hidden');
  document.getElementById('ev_links_list').innerHTML = '';
  document.getElementById('ev_detected_hobby_wrap').classList.add('hidden');
  document.getElementById('ev_detected_hobby_display').innerHTML = '';
  window._pendingHobbyTag = null;
  ev_selectedActivities.clear();
  ev_selectedAtmosphere.clear();
  ev_expandedCategories.clear();
  document.getElementById('ev_error').classList.add('hidden');
  const submitBtn = document.getElementById('ev_submitBtn');
  submitBtn.disabled    = false;
  submitBtn.textContent = 'צור אירוע';
  submitBtn._dedupeConfirmed = false;
  window._pendingEventLinks = [];

  document.getElementById('createEventOverlay').classList.remove('hidden');
}

function getSelectedEvHobbies() {
  const hobbiesText = document.getElementById('ev_hobbies').value.trim();
  return hobbiesText ? hobbiesText.split(',').map(h => h.trim()).filter(h => h.length > 0) : [];
}

function closeCreateEventModal() {
  document.getElementById('createEventOverlay').classList.add('hidden');
}

function selectOrganizerType(type) {
  window._organizerType = type;
  ['self', 'other'].forEach(t => {
    const btn   = document.getElementById(`org_btn_${t}`);
    const label = btn.querySelector('span:last-child');
    const active = (t === type);
    btn.classList.toggle('border-purple-600', active);
    btn.classList.toggle('bg-purple-50',      active);
    btn.classList.toggle('shadow-md',         active);
    btn.classList.toggle('border-gray-200',  !active);
    btn.classList.toggle('bg-white',         !active);
    label.classList.toggle('text-purple-700', active);
    label.classList.toggle('text-gray-600',  !active);
  });

  if (type === 'self') {
    document.getElementById('ev_organizer_name').value  = (me && me.fullName) ? me.fullName : '';
    document.getElementById('ev_organizer_phone').value = (me && me.phone)    ? me.phone    : '';
    document.getElementById('ev_paste_section').classList.add('hidden');
    document.getElementById('ev_paste_text').value = '';
  } else {
    document.getElementById('ev_organizer_name').value  = '';
    document.getElementById('ev_organizer_phone').value = '';
    document.getElementById('ev_paste_section').classList.remove('hidden');
    setTimeout(() => document.getElementById('ev_paste_text').focus(), 50);
  }
  document.getElementById('ev_form_body').classList.remove('hidden');
  document.getElementById('ev_footer').classList.remove('hidden');
  evRenderActivityChips();
  evRefreshAtmosphereChips();
}

async function handleCreateEvent() {
  const errEl = document.getElementById('ev_error');
  const btn   = document.getElementById('ev_submitBtn');
  errEl.classList.add('hidden');

  const title             = document.getElementById('ev_title').value.trim();
  const desc              = document.getElementById('ev_desc').value.trim();
  const dtVal             = document.getElementById('ev_datetime').value;
  const location          = document.getElementById('ev_location').value.trim();
  const associatedHobbies = getSelectedEvHobbies();
  const organizerName     = document.getElementById('ev_organizer_name').value.trim();
  const organizerPhone    = document.getElementById('ev_organizer_phone').value.trim();

  if (!title || !desc || !dtVal || !location || associatedHobbies.length === 0) {
    errEl.textContent = 'אנא מלא את כל שדות החובה (*)';
    errEl.classList.remove('hidden');
    return;
  }

  if (!btn._dedupeConfirmed) {
    const dup = findDuplicateEvent(title, dtVal, location);
    if (dup) {
      errEl.innerHTML = `⚠️ אירוע דומה כבר קיים: <strong>"${dup.title}"</strong>. לחץ שוב לפרסום בכל זאת.`;
      errEl.classList.remove('hidden');
      btn._dedupeConfirmed = true;
      return;
    }
  }
  btn._dedupeConfirmed = false;
  btn.disabled    = true;
  btn.textContent = 'יוצר...';

  try {
    const dateTime         = firebase.firestore.Timestamp.fromDate(new Date(dtVal));
    const actionLinks      = window._pendingEventLinks || [];
    const detectedHobbyTag = window._pendingHobbyTag   || null;
    const atmosphereTags = [...ev_selectedAtmosphere];
    const eventActivityTags = [...ev_selectedActivities];

    const docRef           = await db.collection('events').add({
      title, description: desc, dateTime, location, associatedHobbies,
      hobby: associatedHobbies[0],
      createdBy: me.email, creatorName: me.fullName || me.email, creatorPhone: me.phone || '',
      organizerName: organizerName || me.fullName || me.email,
      organizerPhone: organizerPhone || me.phone || '',
      actionLinks, detectedHobbyTag,
      interested: [{ email: me.email, name: me.fullName || '', display: formatAttendeeDisplay(me.fullName || me.email) }],
      atmosphereTags, eventActivityTags,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });

    const creatorEntry = { email: me.email, name: me.fullName || '', display: formatAttendeeDisplay(me.fullName || me.email) };
    allEventsData.push({
      id: docRef.id, title, description: desc, dateTime, location, associatedHobbies,
      hobby: associatedHobbies[0], createdBy: me.email,
      creatorName: me.fullName || me.email, creatorPhone: me.phone || '',
      organizerName: organizerName || me.fullName || me.email,
      organizerPhone: organizerPhone || me.phone || '',
      actionLinks, detectedHobbyTag, interested: [creatorEntry],
      atmosphereTags, eventActivityTags
    });
    window._pendingEventLinks = [];

    closeCreateEventModal();
    renderEventsGrid();
    showToast('האירוע נוצר בהצלחה! 🎉');
  } catch (err) {
    errEl.textContent = 'שגיאה ביצירת האירוע. נסה שוב.';
    errEl.classList.remove('hidden');
    console.error(err);
  } finally {
    btn.disabled    = false;
    btn.textContent = 'צור אירוע';
  }
}

// ── Google Calendar link ──────────────────────────────────────────────────────
function generateGoogleCalendarLink(ev) {
  const title    = encodeURIComponent(ev.title || '');
  const location = encodeURIComponent(ev.location || '');
  const details  = encodeURIComponent(
    [ev.description,
     ev.actionLinks && ev.actionLinks.length
       ? 'קישורים: ' + ev.actionLinks.map(l => l.url).join(' | ') : ''
    ].filter(Boolean).join('\n\n')
  );
  let dateStr = '';
  if (ev.dateTime) {
    const start = ev.dateTime.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime);
    const end   = new Date(start.getTime() + 2 * 60 * 60 * 1000);
    const fmt   = d => d.toISOString().replace(/[-:.]/g, '').slice(0, 15) + 'Z';
    dateStr = `${fmt(start)}/${fmt(end)}`;
  }
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${dateStr}&details=${details}&location=${location}`;
}

// ── Repeat (copy) a past event into the create form ───────────────────────────
function openRepeatEvent(eventId) {
  const ev = allEventsData.find(e => e.id === eventId);
  if (!ev) return;
  openCreateEventModal();
  selectOrganizerType('self');
  setTimeout(() => {
    document.getElementById('ev_title').value    = ev.title    || '';
    document.getElementById('ev_desc').value     = ev.description || '';
    document.getElementById('ev_location').value = ev.location || '';
    if (ev.organizerName)  document.getElementById('ev_organizer_name').value  = ev.organizerName;
    if (ev.organizerPhone) document.getElementById('ev_organizer_phone').value = ev.organizerPhone;
    const hobbies = ev.associatedHobbies && ev.associatedHobbies.length
      ? ev.associatedHobbies : (ev.hobby ? [ev.hobby] : []);
    if (hobbies.length > 0) document.getElementById('ev_hobbies').value = hobbies.join(', ');
    ev_selectedActivities = new Set((ev.eventActivityTags || []).filter(a => ACTIVITY_TAGS.includes(a)));
    ev_selectedAtmosphere = new Set(ev.atmosphereTags || []);
    evRenderActivityChips();
    evRefreshAtmosphereChips();
  }, 60);
}

// ── Post-event experience modal ───────────────────────────────────────────────
function openPostEventModal(eventId, btn) {
  const evTitle = btn.dataset.evTitle || '';
  const existing = document.getElementById('postEventOverlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'postEventOverlay';
  overlay.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4';
  overlay.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-base font-black text-purple-900">🙌 ${evTitle || 'שתף חוויה'}</h3>
        <button onclick="document.getElementById('postEventOverlay').remove()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <textarea id="postEventText" rows="4" maxlength="500" placeholder="איך היה האירוע? שתף את הקהילה!"
        class="w-full border border-gray-200 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-purple-400 transition"
        style="direction:rtl; text-align:right; font-family:'Heebo',sans-serif;"></textarea>
      <div id="postEventError" class="hidden text-red-500 text-sm mt-2"></div>
      <div class="flex gap-2 mt-4">
        <button onclick="submitPostEvent('${eventId}')"
          class="flex-1 bg-gradient-to-l from-purple-700 to-blue-600 text-white font-bold py-2.5 rounded-xl hover:opacity-90 transition">שתף</button>
        <button onclick="document.getElementById('postEventOverlay').remove()"
          class="flex-1 border border-gray-200 text-gray-500 font-bold py-2.5 rounded-xl hover:bg-gray-50 transition">ביטול</button>
      </div>
    </div>`;
  overlay.addEventListener('click', () => overlay.remove());
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('postEventText').focus(), 50);
}

async function submitPostEvent(eventId) {
  const text  = (document.getElementById('postEventText').value || '').trim();
  const errEl = document.getElementById('postEventError');
  if (!text) {
    errEl.textContent = 'אנא כתוב משהו לפני השיתוף.';
    errEl.classList.remove('hidden');
    return;
  }
  try {
    await db.collection('event_reviews').add({
      eventId, userEmail: me.email, userName: me.fullName || me.email,
      text, createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    document.getElementById('postEventOverlay').remove();
    showToast('תודה על השיתוף! 🙏', 'bg-purple-600');
  } catch (err) {
    document.getElementById('postEventError').textContent = 'שגיאה בשמירה. נסה שוב.';
    document.getElementById('postEventError').classList.remove('hidden');
    console.error(err);
  }
}

// ── Smart deduplication ───────────────────────────────────────────────────────
function findDuplicateEvent(title, dtVal, location) {
  const norm  = s => (s || '').toLowerCase().replace(/[^א-תa-z0-9]/g, '');
  const tN    = norm(title).slice(0, 10);
  const dateD = dtVal ? dtVal.split('T')[0] : '';
  if (!tN || !dateD) return null;
  return allEventsData.find(ev => {
    const evDate  = ev.dateTime
      ? (ev.dateTime.toDate ? ev.dateTime.toDate() : new Date(ev.dateTime)).toISOString().split('T')[0]
      : '';
    const evTitle = norm(ev.title).slice(0, 10);
    return evDate === dateD && evTitle === tN;
  }) || null;
}

// ── Smart Hobby Tagger ────────────────────────────────────────────────────────
// To add new hobby keywords: add an entry to exactMap or semanticMap below.
// exactMap = direct keyword → canonical Hebrew hobby name (Tier 1 — highest confidence)
// semanticMap = context clues → approximate tag with "דומה ל:" prefix (Tier 2)
function extractHobbyFromText(text) {
  const tl = text.toLowerCase();

  const exactMap = [
    { kw: ['פריזבי','פריסבי','frisbee'],                         tag: 'פריזבי' },
    { kw: ['כדורסל','basketball'],                               tag: 'כדורסל' },
    { kw: ['כדורגל','football','soccer'],                        tag: 'כדורגל' },
    { kw: ['כדורעף','ולייבול','volleyball'],                     tag: 'כדורעף' },
    { kw: ['טניס','tennis','פאדל','padel'],                      tag: 'טניס' },
    { kw: ['שחייה','שוחים','בריכה'],                            tag: 'שחייה' },
    { kw: ['גלישה','גולש','גלים','surf','surfing'],              tag: 'גלישה' },
    { kw: ['קיאקים','קיאק','kayak'],                            tag: 'קיאקים' },
    { kw: ['דיג','דגים','fishing'],                              tag: 'דיג' },
    { kw: ['ריצה','ריצות','רצים','מרוץ','מרתון'],               tag: 'ריצה' },
    { kw: ['אופניים','רכיבה','ביקינג','cycling','bike'],        tag: 'רכיבה' },
    { kw: ['טיפוס','בולדרינג','climbing'],                      tag: 'טיפוס' },
    { kw: ['יוגה','yoga'],                                       tag: 'יוגה' },
    { kw: ['פילאטיס','pilates'],                                 tag: 'פילאטיס' },
    { kw: ['קרוספיט','crossfit'],                               tag: 'קרוספיט' },
    { kw: ['קיקבוקסינג','בוקס','boxing','קראטה','karate','ג\'ודו','judo','אגרוף'], tag: 'אמנויות לחימה' },
    { kw: ['טיול','הקינג','hiking','טרק','trek'],                tag: 'טיולים' },
    { kw: ['גינון','גינה','gardening'],                          tag: 'גינון' },
    { kw: ['ריקוד','ריקודים','סלסה','salsa','טנגו','tango'],    tag: 'ריקוד' },
    { kw: ['ציור','צביעה','מצבע','רישום'],                      tag: 'אמנות / ציור' },
    { kw: ['פסל','פסלות','חימר','קרמיקה','pottery'],            tag: 'קרמיקה / פסלות' },
    { kw: ['צילום','מצלמה','פוטוגרפיה','לצלם'],                 tag: 'צילום' },
    { kw: ['נגרות','עיבוד עץ','woodworking'],                   tag: 'נגרות' },
    { kw: ['סריגה','רקמה','knitting','crochet'],                 tag: 'סריגה / רקמה' },
    { kw: ['גיטרה','guitar'],                                   tag: 'גיטרה' },
    { kw: ['פסנתר','piano'],                                     tag: 'פסנתר' },
    { kw: ['שירה','מקהלה'],                                     tag: 'שירה' },
    { kw: ['להקה','band','ג\'אז','jazz'],                       tag: 'מוזיקה' },
    { kw: ['בישול','מטבח','שף','cooking'],                      tag: 'בישול' },
    { kw: ['אפייה','עוגה','לחם','baking'],                      tag: 'אפייה' },
    { kw: ['שחמט','chess'],                                     tag: 'שחמט' },
    { kw: ['קריאה','ספרים','קלאב ספרים'],                       tag: 'קריאה' },
    { kw: ['מדיטציה','meditation','mindfulness'],               tag: 'מדיטציה' },
    { kw: ['לגו','lego'],                                        tag: 'לגו' },
    { kw: ['קפה','בית קפה'],                                    tag: 'קפה' },
    { kw: ['פודקאסט','podcast'],                                tag: 'פודקאסט' },
  ];

  for (const { kw, tag } of exactMap) {
    if (kw.some(k => tl.includes(k.toLowerCase()))) {
      return { tag, type: 'exact' };
    }
  }

  const semanticMap = [
    { words: ['תנועה','גמישות','מתיחה','stretch'],              tag: 'יוגה / תנועה' },
    { words: ['נשימה','הרפיה','breathwork'],                    tag: 'מדיטציה / הרפיה' },
    { words: ['ים','חוף','גלים','מים'],                         tag: 'ספורט ים' },
    { words: ['הר','טבע','יער','שמורה','נחל'],                  tag: 'טיולי טבע' },
    { words: ['אמנות','יצירה','סטודיו','סדנה','workshop'],      tag: 'יצירה / אמנות' },
    { words: ['שיפוץ','ריהוט','בנייה','עץ'],                   tag: 'עשה זאת בעצמך' },
    { words: ['קבוצה','מגרש','ליגה','אימון','חוג'],             tag: 'ספורט קבוצתי' },
  ];

  for (const { words, tag } of semanticMap) {
    if (words.some(w => tl.includes(w))) {
      return { tag, type: 'similar' };
    }
  }

  // Tier 3: extract noun after activity trigger word
  const triggers = ['חוג', 'שיעור', 'מפגש', 'תרגול', 'אימון', 'סדנת', 'שיעורי', 'חוגי'];
  for (const trigger of triggers) {
    const idx = tl.indexOf(trigger);
    if (idx >= 0) {
      const after = text.slice(idx + trigger.length).trimStart().split(/\s+/)[0];
      if (after && after.length > 1 && /[א-ת]/.test(after)) {
        return { tag: after.replace(/[.,!?:*"]+$/, ''), type: 'similar' };
      }
    }
  }

  return null;
}

// ── Smart Event Parse (paste text → auto-fill form) ───────────────────────────
function parseEventText(raw) {
  const text   = raw.trim();
  const result = { title: '', description: text, dateTimeStr: '', location: '', links: [], organizerName: '', organizerPhone: '', detectedHobby: null };

  // 1. Extract URLs
  const urlRegex = /https?:\/\/[^\sא-ת‏‎)]+/g;
  const urls = text.match(urlRegex) || [];
  for (let url of urls) {
    url = url.replace(/[.,!?)]+$/, '');
    if (url.includes('chat.whatsapp.com'))              result.links.push({ type: 'whatsapp_group', url, label: 'קבוצת WhatsApp' });
    else if (url.includes('wa.me'))                     result.links.push({ type: 'whatsapp', url, label: 'WhatsApp' });
    else if (/maps\.google|goo\.gl\/maps|maps\.app\.goo\.gl/.test(url)) result.links.push({ type: 'maps', url, label: 'מיקום במפה' });
    else if (url.includes('waze.com'))                  result.links.push({ type: 'waze', url, label: 'Waze' });
  }

  // 2. Title: first meaningful line
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length > 0) {
    result.title = lines[0].replace(/^[📅🏃⚽🏀🎾🎨🎸🎵🍳🌿📸🚴🥊💃🏊🧗🎯✅📌🔔👋🙌🎉🎊🤝]+\s*/, '').trim();
  }

  // 3. Location
  for (const pat of [/(?:📍|מיקום|כתובת)[:\s-]+([^\n]+)/, /(?:נפגשים|מתקיים|יתקיים)\s+ב([^\n,]+)/]) {
    const m = text.match(pat);
    if (m && m[1]) { result.location = m[1].trim(); break; }
  }

  // 4. Date + time
  const timeM = text.match(/\b(\d{1,2}):(\d{2})\b/);
  const dateM = text.match(/(\d{1,2})[\/.](\d{1,2})(?:[\/.](\d{2,4}))?/);
  if (timeM && dateM) {
    const day = parseInt(dateM[1]), month = parseInt(dateM[2]);
    let year  = dateM[3] ? parseInt(dateM[3]) : new Date().getFullYear();
    if (year < 100) year += 2000;
    const h = parseInt(timeM[1]), min = parseInt(timeM[2]);
    const dt = new Date(year, month - 1, day, h, min);
    if (!isNaN(dt.getTime())) {
      result.dateTimeStr =
        `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}` +
        `T${String(h).padStart(2,'0')}:${String(min).padStart(2,'0')}`;
    }
  }

  // 5. Organizer phone
  const phoneM = text.match(/0\d[\s-]?\d{3}[\s-]?\d{4}/);
  if (phoneM) result.organizerPhone = phoneM[0].replace(/[\s-]/g, '');

  // 6. Organizer name
  for (const pat of [/(?:יוזם|מארגן|ליצירת קשר|לפרטים)[:\s]+([^\n,]+)/, /(?:פרטים אצל|צרו קשר עם)[:\s]+([^\n,]+)/]) {
    const m = text.match(pat);
    if (m && m[1]) { result.organizerName = m[1].trim(); break; }
  }

  // 7. Smart hobby tagging
  result.detectedHobby = extractHobbyFromText(text);

  return result;
}

function handleParseText() {
  const raw = document.getElementById('ev_paste_text').value;
  if (!raw.trim()) return;

  const parsed = parseEventText(raw);

  if (parsed.title)       document.getElementById('ev_title').value          = parsed.title;
  if (parsed.description) document.getElementById('ev_desc').value           = parsed.description;
  if (parsed.dateTimeStr) document.getElementById('ev_datetime').value       = parsed.dateTimeStr;
  if (parsed.location)    document.getElementById('ev_location').value       = parsed.location;
  if (window._organizerType !== 'self') {
    if (parsed.organizerName)  document.getElementById('ev_organizer_name').value  = parsed.organizerName;
    if (parsed.organizerPhone) document.getElementById('ev_organizer_phone').value = parsed.organizerPhone;
  }

  window._pendingEventLinks = parsed.links;
  window._pendingHobbyTag   = parsed.detectedHobby;

  const hobbyWrap    = document.getElementById('ev_detected_hobby_wrap');
  const hobbyDisplay = document.getElementById('ev_detected_hobby_display');
  if (parsed.detectedHobby) {
    hobbyDisplay.innerHTML = `
      <span class="inline-flex items-center text-xs font-semibold text-purple-600"
            style="border:1px solid #7c3aed; border-radius:999px; padding:3px 10px;">
        ${formatHobbyTag(parsed.detectedHobby)}
      </span>`;
    hobbyWrap.classList.remove('hidden');
  }

  const linksPreview = document.getElementById('ev_links_preview');
  const linksList    = document.getElementById('ev_links_list');
  if (parsed.links.length > 0) {
    linksList.innerHTML = parsed.links.map(link => {
      const icon = link.type === 'whatsapp_group' || link.type === 'whatsapp' ? '💬'
        : link.type === 'maps' ? '📍' : link.type === 'waze' ? '🚗' : '🔗';
      return `<span class="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-purple-100 text-purple-700">${icon} ${link.label}</span>`;
    }).join('');
    linksPreview.classList.remove('hidden');
  }

  document.getElementById('ev_paste_section').classList.add('hidden');
  showToast('טקסט נותח בהצלחה! בדוק ועדכן לפי הצורך ✓', 'bg-purple-600');
}

function _togglePasteSectionLegacy() {
  const sec = document.getElementById('ev_paste_section');
  sec.classList.toggle('hidden');
  if (!sec.classList.contains('hidden')) {
    document.getElementById('ev_paste_text').focus();
  }
}
