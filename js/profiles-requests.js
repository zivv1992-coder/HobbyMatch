// ══════════════════════════════════════════════════════════════════════════════
// profiles-requests.js — "💬 שלח הודעה" to someone you're not matched with yet.
// The message arrives as a request under "בקשות" (קונקשנז' tab); accepting it
// creates the match and opens the chat with that message.
// ══════════════════════════════════════════════════════════════════════════════

const REQUEST_MAX_LEN = 300;

// Button used on people cards and in the profile modal
function messageButtonHtml(email, cls = '') {
  const sent = sentRequestEmails.has(email);
  return `<button data-msg-email="${escapeHtml(email)}" data-cls="${cls}" ${sent ? 'disabled' : `onclick="event.stopPropagation(); openMessageComposer('${jsArg(email)}')"`}
    class="${cls} inline-flex items-center justify-center gap-1.5 font-bold text-sm rounded-xl transition ${sent
      ? 'text-purple-400 bg-purple-50 cursor-default'
      : 'text-purple-700 bg-purple-50 hover:bg-purple-100'}">${sent ? '✓ ההודעה נשלחה' : '💬 שלח הודעה'}</button>`;
}

function _markSent(email) {
  sentRequestEmails.add(email);
  document.querySelectorAll(`button[data-msg-email="${CSS.escape(email)}"]`).forEach(btn => {
    btn.outerHTML = messageButtonHtml(email, btn.dataset.cls);
  });
}

// Ready-made opener about a shared hobby — the sender can edit it
function _suggestMessage(user) {
  const first = displayName(user.fullName).split(' ')[0];
  const mine  = getUserHobbies(me);
  const h     = getUserHobbies(user).find(x => mine.includes(x));
  return h
    ? `היי ${first}! ראיתי שגם את/ה בקטע של ${h} ${HOBBY_EMOJI[h] || ''} בא לך להיפגש מתישהו?`
    : `היי ${first}! ראיתי את הפרופיל שלך ונראה שיש לנו על מה לדבר 🙂`;
}

async function openMessageComposer(email) {
  if (!me) { showGuestSignupWall(); return; }
  document.getElementById('profileModal')?.remove();
  let user = allUsers.find(u => u.email === email);
  try {
    if (!user) user = await getUserByEmail(email);
    if (!user) return showToast('המשתמש/ת לא נמצא/ה', 'bg-red-500');
    const existing = await getMessageRequest(me.email, email);
    if (existing && existing.status === 'pending') { _markSent(email); return showToast('כבר שלחת הודעה — מחכים לתשובה 💌', 'bg-purple-600'); }
  } catch (err) {
    console.error(err);
    return showToast('שגיאה בטעינה. נסה/י שוב.', 'bg-red-500');
  }

  const name  = displayName(user.fullName);
  const modal = document.createElement('div');
  modal.id = 'messageComposer';
  modal.className = 'fixed inset-0 z-[60] flex items-end sm:items-center justify-center bg-black/50 p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-3">
        <h3 class="font-black text-purple-900 text-lg">💬 הודעה ל${escapeHtml(name)}</h3>
        <button onclick="document.getElementById('messageComposer').remove()" class="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
      </div>
      <textarea id="mc_text" rows="4" maxlength="${REQUEST_MAX_LEN}"
        class="w-full border border-purple-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-purple-400">${escapeHtml(_suggestMessage(user))}</textarea>
      <p class="text-xs text-gray-400 mt-1.5 leading-relaxed">ההודעה תגיע כבקשה. אם ${escapeHtml(name)} י/תאשר — תיפתח שיחה ביניכם.</p>
      <button id="mc_send" onclick="sendMessageFromComposer('${jsArg(email)}')"
        class="w-full mt-3 bg-gradient-to-l from-purple-700 to-blue-600 text-white font-bold py-3 rounded-xl hover:opacity-90 transition">
        שלח ←
      </button>
    </div>`;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

async function sendMessageFromComposer(email) {
  const text = document.getElementById('mc_text').value.trim();
  if (!text) return showToast('כתוב/י משהו קצר 🙂', 'bg-gray-600');
  const btn = document.getElementById('mc_send');
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    // They already wrote to me → this is mutual: connect right away
    const theirs = incomingRequests.find(r => r.from === email);
    if (theirs) {
      await acceptMessageRequest(theirs);
      await db.collection('chats').doc(_getChatId(me.email, email)).collection('messages')
        .add({ from: me.email, text, sentAt: firebase.firestore.FieldValue.serverTimestamp() });
      incomingRequests = incomingRequests.filter(r => r !== theirs);
      renderRequests();
      showToast('יש קונקשן! 🎉 השיחה נפתחה', 'bg-purple-600');
    } else {
      await sendMessageRequest(me.email, email, text);
      showToast('ההודעה נשלחה 💌', 'bg-purple-600');
    }
    _markSent(email);
    document.getElementById('messageComposer')?.remove();
  } catch (err) {
    console.error(err);
    showToast('שגיאה בשליחה. נסה/י שוב.', 'bg-red-500');
    btn.disabled = false;
    btn.textContent = 'שלח ←';
  }
}

// ── Incoming requests (top of the קונקשנז' tab + bell) ───────────────────────
async function loadRequests() {
  if (!me) return;
  try {
    const reqs = await fetchIncomingRequests(me.email);
    // Attach the sender's profile (shortened name only, like everywhere else)
    incomingRequests = (await Promise.all(reqs.map(async r =>
      ({ ...r, user: allUsers.find(u => u.email === r.from) || await getUserByEmail(r.from) })
    ))).filter(r => r.user);
  } catch (err) {
    console.error('Requests load error:', err);
    incomingRequests = [];
  }
  renderRequests();
}

function renderRequests() {
  const box = document.getElementById('requestsBox');
  if (box) {
    box.classList.toggle('hidden', !incomingRequests.length);
    box.innerHTML = !incomingRequests.length ? '' : `
      <h3 class="font-black text-purple-900 mb-2">💌 בקשות <span class="text-xs bg-purple-600 text-white rounded-full px-2 py-0.5 align-middle">${incomingRequests.length}</span></h3>
      <div class="flex flex-col gap-3">${incomingRequests.map((r, i) => {
        const name = displayName(r.user.fullName);
        return `<div class="bg-white rounded-2xl border border-purple-100 shadow-sm p-4">
          <div class="flex items-center gap-3 mb-2">
            <div class="w-11 h-11 rounded-full bg-purple-50 grid place-items-center font-black text-purple-600 shrink-0">${escapeHtml(getInitials(name))}</div>
            <div class="flex-1 min-w-0"><p class="font-bold text-gray-900 text-sm">${escapeHtml(name)}${r.user.age ? ', ' + escapeHtml(r.user.age) : ''}</p>
              <p class="text-xs text-gray-400 truncate">${escapeHtml(r.user.city || '')}</p></div>
          </div>
          <p class="bg-purple-50 rounded-xl px-3 py-2 text-sm text-gray-700 leading-relaxed mb-3">${escapeHtml(r.text)}</p>
          <div class="flex gap-2">
            <button onclick="respondToRequest(${i}, true, this)" class="flex-1 py-2.5 rounded-xl font-bold text-sm bg-gradient-to-l from-purple-700 to-blue-600 text-white hover:opacity-90 transition">אישור 💬</button>
            <button onclick="respondToRequest(${i}, false, this)" class="flex-1 py-2.5 rounded-xl font-bold text-sm border border-gray-200 text-gray-500 hover:bg-gray-50 transition">לא עכשיו</button>
          </div>
        </div>`;
      }).join('')}</div>`;
  }
  if (typeof _updateBellBadge === 'function') _updateBellBadge();
}

async function respondToRequest(i, accept, btn) {
  const req = incomingRequests[i];
  if (!req) return;
  btn.disabled = true;
  try {
    if (accept) {
      await acceptMessageRequest(req);
      showToast('יש קונקשן! 🎉', 'bg-purple-600');
    } else {
      await declineMessageRequest(req);   // the sender isn't told
    }
    incomingRequests = incomingRequests.filter(r => r !== req);
    renderRequests();
    if (accept) {
      loadMatches();
      openChat(req.from, displayName(req.user.fullName));
    }
  } catch (err) {
    console.error(err);
    showToast('שגיאה. נסה/י שוב.', 'bg-red-500');
    btn.disabled = false;
  }
}
