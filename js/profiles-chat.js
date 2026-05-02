// ══════════════════════════════════════════════════════════════════════════════
// profiles-chat.js — In-app real-time chat between matched users
// ══════════════════════════════════════════════════════════════════════════════

// Deterministic chat ID: sorted sanitized emails joined with __
function _getChatId(emailA, emailB) {
  return [sanitizeEmail(emailA), sanitizeEmail(emailB)].sort().join('__');
}

// Update the red unread badge on the chat button for a specific user
function _updateChatBadge(email, count) {
  const btn = document.querySelector(`button[data-chat-email="${CSS.escape(email)}"]`);
  if (!btn) return;
  let badge = btn.querySelector('.chat-unread-badge');
  if (count > 0) {
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'chat-unread-badge absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-0.5 leading-none pointer-events-none';
      btn.appendChild(badge);
    }
    badge.textContent = count > 9 ? '9+' : String(count);
  } else if (badge) {
    badge.remove();
  }
}

// Background listeners for all matches — tracks unread counts without opening chat
function initMatchChatListeners(matches) {
  matches.forEach(match => {
    const chatId = _getChatId(me.email, match.email);
    if (_matchChatUnsubs[chatId]) return; // already listening

    _matchChatUnsubs[chatId] = db.collection('chats').doc(chatId)
      .collection('messages')
      .onSnapshot(snap => {
        const fromOtherCount = snap.docs.filter(d => d.data().from === match.email).length;
        const lastRead = parseInt(localStorage.getItem('kn_chatRead_' + chatId) || '0');
        const unread   = Math.max(0, fromOtherCount - lastRead);
        _unreadCounts[chatId] = unread;
        _updateChatBadge(match.email, unread);
        _updateBellBadge();
        if (_notifPanelOpen) _renderNotifPanel();
      }, err => console.warn('Badge listener error:', err));
  });
}

function openChat(otherEmail, otherName) {
  _chatOtherEmail = otherEmail;

  document.getElementById('chatName').textContent = otherName;
  document.getElementById('chatModal').classList.remove('hidden');
  document.getElementById('chatMessages').innerHTML =
    '<p class="text-center text-gray-300 text-xs py-4">טוען הודעות...</p>';

  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }

  const chatId = _getChatId(me.email, otherEmail);
  _chatUnsub = db.collection('chats').doc(chatId)
    .collection('messages')
    .orderBy('sentAt')
    .onSnapshot(snap => {
      const fromOtherCount = snap.docs.filter(d => d.data().from === _chatOtherEmail).length;
      localStorage.setItem('kn_chatRead_' + chatId, fromOtherCount);
      _unreadCounts[chatId] = 0;
      _updateChatBadge(_chatOtherEmail, 0);

      const container = document.getElementById('chatMessages');
      if (snap.empty) {
        container.innerHTML = '<p class="text-center text-gray-300 text-xs py-6">אין הודעות עדיין — שלח ראשון!</p>';
        return;
      }
      container.innerHTML = snap.docs.map(d => {
        const msg    = d.data();
        const isMine = msg.from === me.email;
        const time   = msg.sentAt?.toDate
          ? msg.sentAt.toDate().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })
          : '';
        return `
          <div class="flex ${isMine ? 'justify-start' : 'justify-end'} mb-3">
            <div class="max-w-[78%] px-4 py-2.5 text-sm ${isMine
              ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-2xl rounded-tr-sm shadow-md'
              : 'bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-100 shadow-sm'}">
              <p class="leading-relaxed">${msg.text}</p>
              <p class="text-[10px] mt-1 ${isMine ? 'text-white/60' : 'text-gray-400'} text-left">${time}</p>
            </div>
          </div>`;
      }).join('');
      container.scrollTop = container.scrollHeight;
    }, err => console.warn('Chat error:', err));

  setTimeout(() => document.getElementById('chatInput').focus(), 100);
}

function closeChat() {
  document.getElementById('chatModal').classList.add('hidden');
  if (_chatUnsub) { _chatUnsub(); _chatUnsub = null; }
  _chatOtherEmail = null;
}

async function sendChatMessage() {
  const input = document.getElementById('chatInput');
  const text  = input.value.trim();
  if (!text || !_chatOtherEmail) return;
  input.value = '';

  const chatId = _getChatId(me.email, _chatOtherEmail);
  try {
    await db.collection('chats').doc(chatId)
      .collection('messages').add({
        from:   me.email,
        text:   text,
        sentAt: firebase.firestore.FieldValue.serverTimestamp()
      });
  } catch (e) {
    console.error('Send error:', e);
    input.value = text;
  }
}
