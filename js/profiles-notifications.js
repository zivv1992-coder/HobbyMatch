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
      await db.collection('users').doc(sanitizeEmail(me.email)).update({ fcmToken: token });
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
  _matchUnsub = db.collection('likes')
    .where('to', '==', me.email)
    .onSnapshot(async (snap) => {
      for (const change of snap.docChanges()) {
        if (change.type === 'added') {
          const fromEmail = change.doc.data().from;
          if (likedEmails.has(fromEmail) && !_seenMatchEmails.has(fromEmail)) {
            const profile = allUsers.find(u => u.email === fromEmail) || await _fetchUser(fromEmail);
            if (profile) { showMatchPopup(me, profile); }
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
    for (const doc of likedMeSnap.docs) {
      const fromEmail = doc.data().from;
      if (iLikedEmails.has(fromEmail)) {
        const profile = allUsers.find(u => u.email === fromEmail) || await _fetchUser(fromEmail);
        if (profile) matches.push(profile);
      }
    }
    _currentMatches = matches;
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
  const total = unseenMatches + totalUnreadChat;
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

  if (unseenMatches.length === 0 && unreadChats.length === 0) {
    body.innerHTML = `<p class="text-center text-gray-400 py-8 text-sm">אין התראות חדשות 🎯<br/><button onclick="closeNotifPanel(); switchTab('matches')" class="mt-2 text-purple-600 font-semibold text-xs underline">ראה את כל החיבורים</button></p>`;
    return;
  }

  let html = '';

  // New matches
  if (unseenMatches.length > 0) {
    html += `<div class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100">חיבורים חדשים</div>`;
    html += unseenMatches.map(p => {
      const imgHtml = p.profilePhotoURL || p.hobbyImageUrl
        ? `<img src="${p.profilePhotoURL || p.hobbyImageUrl}" class="w-10 h-10 rounded-full object-cover border-2 border-purple-100 flex-shrink-0" loading="lazy"/>`
        : `<div class="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0 text-lg">🎯</div>`;
      return `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-purple-50 cursor-pointer transition"
          onclick="closeNotifPanel(); switchTab('matches')">
          ${imgHtml}
          <div class="flex-1 min-w-0">
            <p class="font-bold text-purple-900 text-sm truncate">${p.fullName || p.name || ''}, ${p.age || ''}</p>
            <p class="text-xs text-gray-400 truncate">📍 ${p.city || ''} · 🎯 ${p.hobby || ''}</p>
          </div>
          <span class="text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full shrink-0">מאצ' חדש!</span>
        </div>`;
    }).join('');
  }

  // Unread messages
  if (unreadChats.length > 0) {
    html += `<div class="px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50 border-b border-gray-100 ${unseenMatches.length > 0 ? 'border-t' : ''}">הודעות שלא נקראו</div>`;
    html += unreadChats.map(({ user: p, count }) => {
      const safeEmail = (p.email || '').replace(/'/g, "\\'");
      const safeName  = (p.fullName || '').replace(/'/g, "\\'");
      const imgHtml = p.profilePhotoURL || p.hobbyImageUrl
        ? `<img src="${p.profilePhotoURL || p.hobbyImageUrl}" class="w-10 h-10 rounded-full object-cover border-2 border-blue-100 flex-shrink-0" loading="lazy"/>`
        : `<div class="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0 text-lg">💬</div>`;
      return `
        <div class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 hover:bg-blue-50 cursor-pointer transition"
          onclick="closeNotifPanel(); openChat('${safeEmail}', '${safeName}')">
          ${imgHtml}
          <div class="flex-1 min-w-0">
            <p class="font-bold text-gray-900 text-sm truncate">${p.fullName || ''}</p>
            <p class="text-xs text-gray-400">שלח לך הודעה חדשה</p>
          </div>
          <span class="text-xs bg-red-500 text-white font-black px-2 py-0.5 rounded-full shrink-0 min-w-[22px] text-center">${count > 9 ? '9+' : count}</span>
        </div>`;
    }).join('');
  }

  body.innerHTML = html;
}

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
