// ══════════════════════════════════════════════════════════════════════════════
// profiles-notifications.js — FCM push, bell badge, notification panel
// ══════════════════════════════════════════════════════════════════════════════

async function initNotifications() {
  // 1. Register service worker
  if ('serviceWorker' in navigator) {
    try {
      await navigator.serviceWorker.register('firebase-messaging-sw.js');
    } catch (e) { console.warn('SW registration failed:', e); }
  }

  // 2. Real-time match listener (works even without push permission)
  _startMatchListener();

  // 3. Load existing matches for the bell panel
  await _refreshMatches();

  // 4. Show permission popup if not yet asked
  const pushStatus = localStorage.getItem('kn_push_status');
  if (!pushStatus && 'Notification' in window && Notification.permission === 'default' && 'PushManager' in window) {
    setTimeout(_showPermissionPopup, 2500);
  } else if (Notification.permission === 'granted' || pushStatus === 'granted') {
    _setupFCM();
  }
}

function _showPermissionPopup() {
  const overlay = document.getElementById('npOverlay');
  overlay.classList.remove('hidden');
  setTimeout(() => {
    document.getElementById('npWin').style.transform = 'scale(1)';
  }, 10);
}

async function grantPushPermission() {
  document.getElementById('npOverlay').classList.add('hidden');
  const perm = await Notification.requestPermission();
  if (perm === 'granted') {
    localStorage.setItem('kn_push_status', 'granted');
    _setupFCM();
  } else {
    localStorage.setItem('kn_push_status', 'denied');
  }
}

function denyPushPermission() {
  document.getElementById('npOverlay').classList.add('hidden');
  localStorage.setItem('kn_push_status', 'denied');
}

async function _setupFCM() {
  if (!('PushManager' in window)) return;
  if (typeof FCM_VAPID_KEY === 'undefined' || FCM_VAPID_KEY === 'YOUR_FCM_VAPID_KEY') return;
  try {
    _fcmMessaging = firebase.messaging();
    const token = await _fcmMessaging.getToken({ vapidKey: FCM_VAPID_KEY });
    if (token) {
      console.log('FCM token ready');
      // Save token so Cloud Functions can send push to this device
      db.collection('users').doc(sanitizeEmail(me.email)).update({ fcmToken: token })
        .catch(e => console.warn('FCM token save error:', e));
    }
    _fcmMessaging.onMessage((payload) => {
      showToast(payload.notification?.title || 'שותף חדש! 🎉', 'bg-purple-600');
      _refreshMatches();
    });
  } catch (e) { console.warn('FCM setup error:', e); }
}

// Listen for new incoming likes → detect mutual matches in real-time
function _startMatchListener() {
  if (_matchUnsub) _matchUnsub();
  let listenerReady = false;
  _matchUnsub = db.collection('likes')
    .where('to', '==', me.email)
    .onSnapshot(async (snap) => {
      // Skip initial snapshot — likedEmails may not be loaded yet and all docs
      // arrive as "added", causing false match popups. _refreshMatches handles initial state.
      if (!listenerReady) { listenerReady = true; await _refreshMatches(); return; }
      for (const change of snap.docChanges()) {
        if (change.type === 'added') {
          const fromEmail = change.doc.data().from;
          if (likedEmails.has(fromEmail) && !_seenMatchEmails.has(fromEmail)) {
            const profile = allUsers.find(u => u.email === fromEmail) || await _fetchUser(fromEmail);
            if (profile) {
              showMatchPopup(me, profile);
              // Don't mark as seen here — bell badge stays visible until user opens the panel
            }
          } else if (!likedEmails.has(fromEmail)) {
            // Non-mutual like — anonymous toast
            showToast('מישהו/י עשה לך לייק לתחביב!', 'bg-pink-500');
          }
        }
      }
      await _refreshMatches();
    }, (e) => console.warn('Match listener error:', e));
}

async function _fetchUser(email) {
  try {
    const doc = await db.collection('users').doc(sanitizeEmail(email)).get();
    return doc.exists ? doc.data() : null;
  } catch { return null; }
}

async function _refreshMatches() {
  try {
    const myLikesSnap  = await db.collection('likes').where('from', '==', me.email).get();
    const iLikedEmails = new Set(myLikesSnap.docs.map(d => d.data().to));
    const likedMeSnap  = await db.collection('likes').where('to',   '==', me.email).get();

    const matches = [];
    const likers  = [];
    for (const doc of likedMeSnap.docs) {
      const fromEmail = doc.data().from;
      const profile = allUsers.find(u => u.email === fromEmail) || await _fetchUser(fromEmail);
      if (!profile) continue;
      (iLikedEmails.has(fromEmail) ? matches : likers).push(profile);
    }
    _currentMatches      = matches;
    _pendingLikers       = likers;
    _pendingLikesCount   = likers.length;
    initMatchChatListeners(matches);
    if (_notifPanelOpen) {
      matches.forEach(p => _seenMatchEmails.add(p.email));
      localStorage.setItem(_seenKey, JSON.stringify([..._seenMatchEmails]));
      _renderNotifPanel();
    }
    _updateBellBadge();
  } catch (e) { console.warn('refreshMatches error:', e); }
}

function _updateBellBadge() {
  const unseenMatches   = _currentMatches.filter(p => !_seenMatchEmails.has(p.email)).length;
  const totalUnreadChat = Object.values(_unreadCounts).reduce((sum, n) => sum + n, 0);
  const unseenLikes     = Math.max(0, _pendingLikesCount - _seenLikesCount);
  const total = unseenMatches + totalUnreadChat + unseenLikes + incomingRequests.length;
  const badge = document.getElementById('bellBadge');
  if (total > 0) {
    badge.textContent = total > 9 ? '9+' : String(total);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

function _getUnreadChats() {
  return _currentMatches
    .map(u => ({ user: u, count: _unreadCounts[_getChatId(me.email, u.email)] || 0 }))
    .filter(x => x.count > 0);
}

function toggleNotifPanel() {
  _notifPanelOpen ? closeNotifPanel() : _openNotifPanel();
}

function _openNotifPanel() {
  _notifPanelOpen = true;
  const overlay = document.getElementById('npPanelOverlay');
  const panel   = document.getElementById('npPanel');
  overlay.classList.remove('hidden');
  panel.classList.remove('hidden');
  requestAnimationFrame(() => {
    panel.style.opacity   = '1';
    panel.style.transform = 'translateY(0) scale(1)';
  });
  _renderNotifPanel();
  _currentMatches.forEach(p => _seenMatchEmails.add(p.email));
  localStorage.setItem(_seenKey, JSON.stringify([..._seenMatchEmails]));
  _seenLikesCount = _pendingLikesCount;
  localStorage.setItem(_seenLikesKey, String(_seenLikesCount));
  _updateBellBadge();
}

function closeNotifPanel() {
  _notifPanelOpen = false;
  const panel   = document.getElementById('npPanel');
  const overlay = document.getElementById('npPanelOverlay');
  panel.style.opacity   = '0';
  panel.style.transform = 'translateY(-8px) scale(.97)';
  setTimeout(() => {
    panel.classList.add('hidden');
    overlay.classList.add('hidden');
  }, 200);
}

function _renderNotifPanel() {
  const body          = document.getElementById('npPanelBody');
  const unseenMatches = _currentMatches.filter(p => !_seenMatchEmails.has(p.email));
  const unreadChats   = _getUnreadChats();

  if (unseenMatches.length === 0 && unreadChats.length === 0 && _pendingLikers.length === 0 && incomingRequests.length === 0) {
    body.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">אין התראות חדשות 🎯<br/><button onclick="closeNotifPanel(); switchTab('matches')" class="mt-2 text-purple-600 font-semibold text-xs underline">ראה את כל החיבורים</button></p>`;
    return;
  }

  let html = '';

  // A person row: initials, shortened name + age, a short line, and action buttons
  const personRow = (p, line, actions, bg, onclick) => `
      <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 ${bg} cursor-pointer transition" onclick="${onclick}">
        <div class="w-10 h-10 rounded-full bg-white border border-purple-100 flex items-center justify-center flex-shrink-0 font-black text-purple-600">${escapeHtml(getInitials(displayName(p.fullName)))}</div>
        <div class="flex-1 min-w-0">
          <p class="font-bold text-purple-900 text-sm truncate">${escapeHtml(displayName(p.fullName))}${p.age ? ', ' + escapeHtml(p.age) : ''}</p>
          <p class="text-xs text-gray-500 truncate">${line}</p>
        </div>
        <div class="flex gap-1.5 shrink-0">${actions}</div>
      </div>`;
  const section = title => `<div class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">${title}</div>`;
  const btn = (label, cls, onclick) => `<button onclick="event.stopPropagation(); ${onclick}" class="text-xs font-bold px-2.5 py-1.5 rounded-lg transition ${cls}">${label}</button>`;

  // Message requests — the message itself is shown only after approving (the chat opens with it)
  if (incomingRequests.length > 0) {
    html += section('💌 בקשות הודעה');
    html += incomingRequests.map((r, i) => personRow(r.user, 'רוצה לשלוח לך הודעה',
      btn('אישור 💬', 'bg-purple-600 text-white hover:bg-purple-700', `respondToRequestFromBell(${i}, true, this)`)
      + btn('✕', 'bg-white text-gray-400 border border-gray-200 hover:bg-gray-50', `respondToRequestFromBell(${i}, false, this)`),
      'bg-purple-50 hover:bg-purple-100', `openRequestProfile(${i})`)).join('');
  }

  // Likes — who liked me; liking back makes a connection
  if (_pendingLikers.length > 0) {
    html += section('💜 עשו לך לייק');
    html += _pendingLikers.map((p, i) => personRow(p, `📍 ${escapeHtml(p.city || '')}`,
      btn('💜 בחזרה', 'bg-pink-500 text-white hover:bg-pink-600', `likeBackFromBell(${i}, this)`),
      'bg-pink-50 hover:bg-pink-100', `openLikerProfile(${i})`)).join('');
  }

  // New matches
  if (unseenMatches.length > 0) {
    html += `<div class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">חיבורים חדשים</div>`;
    html += unseenMatches.map(p => {
      const imgHtml = p.profilePhotoURL || p.hobbyImageUrl
        ? `<img src="${p.profilePhotoURL || p.hobbyImageUrl}" class="w-10 h-10 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" loading="lazy"/>`
        : `<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-lg">🤝</div>`;
      return `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-purple-50 cursor-pointer transition"
          onclick="closeNotifPanel(); switchTab('matches')">
          ${imgHtml}
          <div class="flex-1 min-w-0">
            <p class="font-bold text-purple-900 text-sm truncate">${escapeHtml(displayName(p.fullName || p.name))}, ${escapeHtml(p.age || '')}</p>
            <p class="text-xs text-gray-400 truncate">📍 ${escapeHtml(p.city || '')} · 🎯 ${escapeHtml(p.hobby || '')}</p>
          </div>
          <span class="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full shrink-0">חיבור! 🤝</span>
        </div>`;
    }).join('');
  }

  // Unread messages
  if (unreadChats.length > 0) {
    html += `<div class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 ${unseenMatches.length > 0 ? 'border-t' : ''}">הודעות שלא נקראו</div>`;
    html += unreadChats.map(({ user: p, count }) => {
      const safeEmail = jsArg(p.email);
      const safeName  = jsArg(displayName(p.fullName));
      const imgHtml = p.profilePhotoURL || p.hobbyImageUrl
        ? `<img src="${p.profilePhotoURL || p.hobbyImageUrl}" class="w-10 h-10 rounded-full object-cover border-2 border-blue-100 flex-shrink-0" loading="lazy"/>`
        : `<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">💬</div>`;
      return `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition"
          onclick="closeNotifPanel(); openChat('${safeEmail}', '${safeName}')">
          ${imgHtml}
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 text-sm truncate">${escapeHtml(displayName(p.fullName))}</p>
            <p class="text-xs text-gray-400">שלח לך הודעה חדשה</p>
          </div>
          <span class="text-xs bg-red-500 text-white font-black px-2 py-0.5 rounded-full shrink-0 min-w-[22px] text-center">${count > 9 ? '9+' : count}</span>
        </div>`;
    }).join('');
  }

  body.innerHTML = html;
}

// ── Bell actions ──────────────────────────────────────────────────────────────
async function respondToRequestFromBell(i, accept, btn) {
  if (accept) closeNotifPanel();          // the chat opens on top
  await respondToRequest(i, accept, btn); // profiles-requests.js — accept opens the chat with the message
}

function openRequestProfile(i) {
  const r = incomingRequests[i];
  if (!r) return;
  closeNotifPanel();
  showProfileModal(r.user, likedEmails.has(r.user.email), me);
}

function openLikerProfile(i) {
  const p = _pendingLikers[i];
  if (!p) return;
  closeNotifPanel();
  showProfileModal(p, false, me);
}

async function likeBackFromBell(i, btnEl) {
  const p = _pendingLikers[i];
  if (!p) return;
  btnEl.disabled = true;
  try {
    await saveLike(me.email, p.email);    // they already liked me → this is a match
    likedEmails.add(p.email);
    _pendingLikers.splice(i, 1);
    _pendingLikesCount = _pendingLikers.length;
    _seenLikesCount    = Math.min(_seenLikesCount, _pendingLikesCount);
    localStorage.setItem(_seenLikesKey, String(_seenLikesCount));
    closeNotifPanel();
    showMatchPopup(me, p);
    _refreshMatches();
    if (activeTab === 'matches') loadMatches();
  } catch (err) {
    console.error(err);
    showToast('שגיאה בשליחת הלייק. נסה/י שוב.', 'bg-red-500');
    btnEl.disabled = false;
  }
}

// ── Delete Test Data (run once from console: deleteTestData()) ────────────────
window.deleteTestData = async function() {
  const testEmails = ['test1@example.com','test2@example.com','test3@example.com','test4@example.com'];
  for (const email of testEmails) {
    await db.collection('users').doc(sanitizeEmail(email)).delete();
  }
  const likesSnap = await db.collection('likes').where('from','in',testEmails).get();
  const likesSnap2 = await db.collection('likes').where('to','in',testEmails).get();
  const deletions = [...likesSnap.docs, ...likesSnap2.docs].map(d => d.ref.delete());
  await Promise.all(deletions);
  console.log('✅ משתמשי בדיקה נמחקו');
  showToast('✅ משתמשי בדיקה נמחקו', 'bg-red-600');
};

// ── Test Data (run in browser console: createTestData()) ─────────────────────
window.createTestData = async function() {
  const testProfiles = [
    { email: 'test1@example.com', fullName: 'דן כהן',   age: 28, city: 'תל אביב',  hobby: 'כדורסל', phone: '0501234567', profilePhotoURL: 'https://via.placeholder.com/200?text=Dan'   },
    { email: 'test2@example.com', fullName: 'שירה לוי', age: 26, city: 'תל אביב',  hobby: 'כדורסל', phone: '0502345678', profilePhotoURL: 'https://via.placeholder.com/200?text=Shira' },
    { email: 'test3@example.com', fullName: 'אלי נחום', age: 30, city: 'ירושלים', hobby: 'יוגה',    phone: '0503456789', profilePhotoURL: 'https://via.placeholder.com/200?text=Eli'   },
    { email: 'test4@example.com', fullName: 'עדי ברק',  age: 27, city: 'חיפה',    hobby: 'טיולים',  phone: '0504567890', profilePhotoURL: 'https://via.placeholder.com/200?text=Adi'   }
  ];
  console.log('יוצר 4 פרופילים...');
  for (const profile of testProfiles) {
    await db.collection('users').doc(sanitizeEmail(profile.email)).set(profile);
  }
  console.log('יוצר מאץ בין דן לשירה...');
  await db.collection('likes').add({ from: 'test1@example.com', to: 'test2@example.com' });
  await db.collection('likes').add({ from: 'test2@example.com', to: 'test1@example.com' });
  console.log('יוצר אירוע לשבוע הבא...');
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(18, 0, 0, 0);
  await db.collection('events').add({
    title: 'משחק כדורסל ידידותי 🏀',
    description: 'בואו למשחק כדורסל ידידותי באולם הספורט. כל הרמות מוזמנות!',
    dateTime: nextWeek, location: 'תל אביב - אולם הספורט המרכזי',
    associatedHobbies: ['כדורסל', 'ספורט'], organizerName: 'דן כהן',
    organizerPhone: '0501234567', attendees: [], createdAt: new Date(), isPublic: true
  });
  showToast('✅ נתונים בדיקה נוצרו בהצלחה! עדכן את הדף.', 'bg-green-600');
  console.log('✅ בוצע!');
};
