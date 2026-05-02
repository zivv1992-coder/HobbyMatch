// ─── Profile Card ─────────────────────────────────────────────────────────────

const HEART_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/></svg>`;
const HEART_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>`;

// ─── Carousel helpers ─────────────────────────────────────────────────────────

function buildCarouselHtml(user) {
  const images = (user.hobbyImages && user.hobbyImages.length)
    ? user.hobbyImages
    : (user.hobbyImageUrl ? [user.hobbyImageUrl] : []);

  if (images.length === 0) {
    return `<div class="aspect-[4/3] bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center text-6xl">🎯</div>`;
  }

  const slidesHtml = images.map(url =>
    `<img src="${url}" alt="תמונת תחביב" class="w-full h-full flex-none object-contain bg-gray-50 border border-gray-200 cursor-zoom-in" onclick="event.stopPropagation();openImageLightbox('${url}')"/>`
  ).join('');

  const multi = images.length > 1;

  const arrowsHtml = multi ? `
    <button class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-lg font-bold leading-none select-none"
            data-next onclick="event.stopPropagation();carouselNext(this)">&#8250;</button>
    <button class="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10 text-lg font-bold leading-none select-none"
            data-prev onclick="event.stopPropagation();carouselPrev(this)">&#8249;</button>` : '';

  const dotsHtml = multi ? `
    <div class="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 pointer-events-none z-10" data-dots>
      ${images.map((_, i) =>
        `<span class="block w-1.5 h-1.5 rounded-full bg-white transition-opacity" style="opacity:${i === 0 ? 1 : 0.4}"></span>`
      ).join('')}
    </div>` : '';

  return `
    <div class="relative aspect-[4/3] overflow-hidden group carousel-wrap" data-idx="0">
      <div class="flex h-full transition-transform duration-300 ease-in-out" data-slides style="direction:ltr;transform:translateX(0%)">
        ${slidesHtml}
      </div>
      ${arrowsHtml}
      ${dotsHtml}
    </div>`;
}

function carouselGoTo(wrap, idx) {
  const slides = wrap.querySelector('[data-slides]');
  const total  = slides.children.length;
  idx = ((idx % total) + total) % total;
  wrap.dataset.idx = idx;
  slides.style.transform = `translateX(-${idx * 100}%)`;
  wrap.querySelectorAll('[data-dots] span').forEach((dot, i) => {
    dot.style.opacity = i === idx ? '1' : '0.4';
  });
}

function carouselNext(btn) {
  const wrap = btn.closest('.carousel-wrap');
  carouselGoTo(wrap, parseInt(wrap.dataset.idx || 0) + 1);
}

function carouselPrev(btn) {
  const wrap = btn.closest('.carousel-wrap');
  carouselGoTo(wrap, parseInt(wrap.dataset.idx || 0) - 1);
}

// Attach touch-swipe listeners to every .carousel-wrap in the document.
// Safe to call multiple times — won't double-bind.
function initCarousels() {
  document.querySelectorAll('.carousel-wrap').forEach(wrap => {
    if (wrap.dataset.carouselBound) return;
    wrap.dataset.carouselBound = '1';

    let startX = 0;

    wrap.addEventListener('touchstart', e => {
      startX = e.touches[0].clientX;
    }, { passive: true });

    wrap.addEventListener('touchend', e => {
      const delta = e.changedTouches[0].clientX - startX;
      if (Math.abs(delta) > 40) {
        wrap.dataset.swiped = '1';
        const total = wrap.querySelector('[data-slides]').children.length;
        if (total <= 1) return;
        // swipe left → next; swipe right → prev
        carouselGoTo(wrap, parseInt(wrap.dataset.idx || 0) + (delta < 0 ? 1 : -1));
      }
    }, { passive: true });
  });
}

// Opens the profile modal, but ignores the click if it followed a carousel swipe.
function handleCardImageClick(user, isLiked, myUser, event) {
  const carousel = event.target.closest('.carousel-wrap');
  if (carousel && carousel.dataset.swiped === '1') {
    carousel.dataset.swiped = '0';
    return;
  }
  showProfileModal(user, isLiked, myUser);
}

function renderCard(user, isLiked, myUser, isMatch) {
  const dist = (myUser && myUser.latitude && user.latitude)
    ? Math.round(distanceKm(myUser.latitude, myUser.longitude, user.latitude, user.longitude))
    : null;

  // Avatar: show profile photo only for matched users
  const initials = (user.fullName || '?').trim()[0].toUpperCase();
  const avatarHtml = (isMatch && user.profilePhotoURL)
    ? `<img src="${user.profilePhotoURL}" class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100 shrink-0" alt=""/>`
    : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-base ring-2 ring-purple-100 shrink-0">${initials}</div>`;

  // Like button
  const heartBtnClass = isLiked
    ? 'flex items-center gap-1.5 transition-transform active:scale-90 text-red-500'
    : 'flex items-center gap-1.5 transition-transform active:scale-90 text-gray-400 hover:text-red-400';

  const romanticBadge = user.romantic
    ? `<span class="inline-flex items-center gap-1 bg-pink-50 text-pink-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-pink-100">❤️ פתוח/ה לקשר רומנטי</span>`
    : '';

  const hobbyTags = (user.hobby || '').split(',').map(h => h.trim()).filter(Boolean).slice(0, 3)
    .map(h => `<span class="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">#${h}</span>`)
    .join('');

  const userJson   = JSON.stringify(user).replace(/"/g, '&quot;');
  const myUserJson = JSON.stringify(myUser).replace(/"/g, '&quot;');

  return `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
         data-email="${user.email}">

      <!-- Post Header -->
      <div class="flex items-center gap-3 px-4 py-3 cursor-pointer"
           onclick="showProfileModal(${userJson}, ${isLiked}, ${myUserJson})">
        ${avatarHtml}
        <div class="flex-1 min-w-0">
          <p class="font-bold text-gray-900 text-sm leading-tight">${user.fullName}, ${user.age}</p>
          <p class="text-xs text-gray-400 mt-0.5">📍 ${user.city}${dist !== null ? ` · ${dist} ק"מ` : ''}</p>
        </div>
        ${user.romantic ? `<span class="text-base shrink-0" title="פתוח/ה לקשר רומנטי">❤️</span>` : ''}
      </div>

      <!-- Post Image / Carousel -->
      <div class="relative cursor-pointer"
           onclick="handleCardImageClick(${userJson}, ${isLiked}, ${myUserJson}, event)">
        ${buildCarouselHtml(user)}
        ${hobbyTags ? `<div class="absolute bottom-3 right-3 flex flex-wrap gap-1 justify-end max-w-[90%] z-20">${hobbyTags}</div>` : ''}
      </div>

      <!-- Actions & Caption -->
      <div class="px-4 pt-3 pb-4 flex flex-col gap-2">
        <button
          class="${heartBtnClass}"
          onclick="event.stopPropagation(); handleLike('${user.email}', '${user.fullName}', this)"
          data-liked="${isLiked}"
        >${isLiked ? HEART_FILLED : HEART_OUTLINE}<span class="like-label text-sm font-semibold">${isLiked ? 'ביטול לייק' : 'לייק'}</span></button>
        ${user.hobbyDescription ? `<p class="text-gray-600 text-sm leading-relaxed line-clamp-2">${user.hobbyDescription}</p>` : ''}
        ${user.interests ? `<p class="text-gray-400 text-xs leading-relaxed line-clamp-1">✨ ${user.interests}</p>` : ''}
        ${romanticBadge}
      </div>
    </div>`;
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function showProfileModal(user, isLiked, myUser, isMatched = false) {
  // Remove any existing modal
  const existing = document.getElementById('profileModal');
  if (existing) existing.remove();

  const dist = (myUser && myUser.latitude && user.latitude)
    ? Math.round(distanceKm(myUser.latitude, myUser.longitude, user.latitude, user.longitude))
    : null;

  // Hobbies — support comma-separated list
  const hobbies = (user.hobby || '').split(',').map(h => h.trim()).filter(Boolean);
  const hobbyTags = hobbies.map(h =>
    `<span class="inline-block bg-purple-100 text-purple-700 text-sm font-bold px-3 py-1 rounded-full">${h}</span>`
  ).join('');

  const modalCarouselHtml = buildCarouselHtml(user);

  const romanticBadge = user.romantic
    ? `<span class="inline-block bg-pink-100 text-pink-600 text-xs font-bold px-3 py-1 rounded-full">❤️ פתוח/ה לקשר רומנטי</span>`
    : '';

  const likedClass = isLiked
    ? 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-400 border border-transparent hover:border-red-200'
    : 'bg-gradient-to-l from-purple-700 to-blue-600 text-white hover:opacity-90';
  const likedText = isLiked ? '✅ הלייק נשלח — לחץ לביטול' : 'לייק';

  const modal = document.createElement('div');
  modal.id = 'profileModal';
  modal.className = 'fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto"
         onclick="event.stopPropagation()">
      <!-- Header -->
      <div class="flex items-center justify-between px-5 pt-5 pb-2">
        <div>
          <h2 class="text-xl font-black text-purple-900">${user.fullName}, ${user.age}</h2>
          <p class="text-sm text-gray-500">📍 ${user.city}${dist !== null ? ` · ${dist} ק"מ ממך` : ''}</p>
        </div>
        <button onclick="document.getElementById('profileModal').remove()"
          class="text-gray-400 hover:text-gray-600 text-2xl leading-none">✕</button>
      </div>

      <!-- Images -->
      <div class="mt-2 overflow-hidden">
        ${modalCarouselHtml}
      </div>

      <!-- Details -->
      <div class="px-5 py-4 flex flex-col gap-3">
        <!-- Hobbies -->
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase mb-1.5">תחביבים</p>
          <div class="flex flex-wrap gap-2">${hobbyTags}</div>
        </div>

        <!-- Description -->
        ${user.hobbyDescription ? `
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase mb-1">תיאור התחביבים</p>
          <p class="text-gray-600 text-sm leading-relaxed">${user.hobbyDescription}</p>
        </div>` : ''}

        <!-- Interests -->
        ${user.interests ? `
        <div>
          <p class="text-xs font-bold text-gray-400 uppercase mb-1">תחומי עניין</p>
          <p class="text-gray-600 text-sm leading-relaxed">✨ ${user.interests}</p>
        </div>` : ''}

        <!-- Badges -->
        ${romanticBadge ? `<div>${romanticBadge}</div>` : ''}

        <!-- Like / Match actions -->
        ${myUser && isMatched ? `
        <div class="flex flex-col gap-2">
          <div class="flex gap-2">
            <button onclick="openChat('${user.email.replace(/'/g,"\\'")}', '${user.fullName.replace(/'/g,"\\'")}'); document.getElementById('profileModal').remove()"
              class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm border border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 transition">
              💬 צ'אט
            </button>
            ${formatWhatsApp(user.phone||'').length >= 11 ? `<a href="https://wa.me/${formatWhatsApp(user.phone||'')}" target="_blank" rel="noopener noreferrer"
              class="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl font-bold text-sm border border-green-200 text-green-700 bg-green-50 hover:bg-green-100 transition text-decoration-none" style="text-decoration:none;">
              📱 ווצאפ
            </a>` : ''}
          </div>
          <button onclick="handleUnmatch('${user.email.replace(/'/g,"\\'")}', this)"
            class="w-full py-2.5 rounded-xl font-bold text-sm border border-red-200 text-red-500 bg-red-50 hover:bg-red-100 transition">
            💔 ביטול מאצ'
          </button>
        </div>` : myUser ? `<button
          id="modalLikeBtn"
          class="w-full py-3 rounded-xl font-bold text-sm transition ${likedClass}"
          onclick="handleModalLike('${user.email}', '${user.fullName}', this)"
          data-liked="${isLiked}"
        >${likedText}</button>` : ''}

      </div>
    </div>`;

  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
  initCarousels();
}

// ─── Report Modal ─────────────────────────────────────────────────────────────

function showReportModal(reportedEmail, reportedName, reporterEmail, reporterName) {
  const existing = document.getElementById('reportModal');
  if (existing) existing.remove();

  const reasons = [
    'תוכן לא הולם',
    'הטרדה או בריונות',
    'פרופיל מזויף',
    'ספאם',
    'אחר',
  ];

  const modal = document.createElement('div');
  modal.id = 'reportModal';
  modal.className = 'fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4';
  modal.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-5" onclick="event.stopPropagation()">
      <div class="flex items-center justify-between mb-4">
        <h3 class="font-black text-gray-800 text-base">🚩 דיווח על ${reportedName}</h3>
        <button onclick="document.getElementById('reportModal').remove()" class="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
      </div>
      <p class="text-xs text-gray-500 mb-3">בחר סיבת הדיווח:</p>
      <div class="flex flex-col gap-2 mb-4" id="reportReasons">
        ${reasons.map((r, i) => `
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="reportReason" value="${r}" class="accent-red-500" ${i === 0 ? 'checked' : ''}/>
            <span class="text-sm text-gray-700">${r}</span>
          </label>`).join('')}
      </div>
      <p id="reportError" class="hidden text-xs text-red-500 mb-2"></p>
      <button id="reportSubmitBtn"
        onclick="submitReportFromModal('${reportedEmail}', '${reporterEmail}', '${reporterName}', this)"
        class="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold text-sm rounded-xl transition">
        שלח דיווח
      </button>
    </div>`;
  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

async function submitReportFromModal(reportedEmail, reporterEmail, reporterName, btn) {
  const selected = document.querySelector('input[name="reportReason"]:checked');
  const errEl    = document.getElementById('reportError');
  if (!selected) {
    errEl.textContent = 'אנא בחר סיבה';
    errEl.classList.remove('hidden');
    return;
  }
  btn.disabled = true;
  btn.textContent = 'שולח...';
  try {
    await submitReport(reportedEmail, reporterEmail, reporterName, selected.value);
    document.getElementById('reportModal').remove();
    document.getElementById('profileModal')?.remove();
    if (typeof showToast === 'function') showToast('הדיווח נשלח. תודה! 🙏', 'bg-orange-500');
  } catch (e) {
    btn.disabled = false;
    btn.textContent = 'שלח דיווח';
    errEl.textContent = 'שגיאה בשליחה. נסה שוב.';
    errEl.classList.remove('hidden');
  }
}

// ─── Match Card (My Matches tab) ──────────────────────────────────────────────

function formatWhatsApp(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0'))   return '972' + digits.slice(1);
  return '972' + digits;
}

function renderMatchCard(user, myUser) {
  const dist = (myUser && myUser.latitude && user.latitude)
    ? Math.round(distanceKm(myUser.latitude, myUser.longitude, user.latitude, user.longitude))
    : null;

  // Show personal profile photo; fall back to hobby image; then placeholder
  const photoSrc = user.profilePhotoURL || user.hobbyImageUrl || '';
  const imgHtml = photoSrc
    ? `<img src="${photoSrc}" alt="" class="w-16 h-16 rounded-full object-cover border-2 border-purple-300"/>`
    : `<div class="w-16 h-16 rounded-full bg-gradient-to-br from-purple-300 to-blue-300 flex items-center justify-center text-2xl border-2 border-purple-300">🎯</div>`;

  const waNumber = formatWhatsApp(user.phone || '');
  const waValid  = waNumber.length >= 11;
  const waBtn    = waValid
    ? `<a href="https://wa.me/${waNumber}" target="_blank" rel="noopener noreferrer"
          class="shrink-0 flex items-center gap-1.5 bg-[#25D366] text-white font-bold text-sm px-3 py-2 rounded-xl hover:bg-[#1ebe5d] transition">
         <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
         WhatsApp
       </a>`
    : ``;

  const safeEmail = (user.email || '').replace(/'/g, "\\'");
  const safeName  = (user.fullName || '').replace(/'/g, "\\'");
  const userJson   = JSON.stringify(user).replace(/"/g, '&quot;');
  const myUserJson = JSON.stringify(myUser || null).replace(/"/g, '&quot;');
  return `
    <div class="bg-white rounded-2xl shadow-md p-4 flex items-center gap-4">
      <div class="flex items-center gap-4 flex-1 min-w-0 cursor-pointer"
           onclick="showProfileModal(${userJson}, false, ${myUserJson}, true)">
        ${imgHtml}
        <div class="min-w-0">
          <p class="font-black text-purple-900">${user.fullName}</p>
          <p class="text-sm text-gray-500">📍 ${user.city}${dist !== null ? ` · ${dist} ק"מ` : ''} · 🎯 ${user.hobby}</p>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <button onclick="openChat('${safeEmail}', '${safeName}')"
          data-chat-email="${user.email}"
          class="relative flex items-center gap-1.5 border border-purple-200 text-purple-700 font-bold text-sm px-3 py-2 rounded-xl hover:bg-purple-50 transition">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/></svg>
          צ'אט
        </button>
        ${waBtn}
      </div>
    </div>`;
}

// ─── Match Popup ───────────────────────────────────────────────────────────────

function showMatchPopup(myUser, matchedUser) {
  // Prefer personal profile photo for match celebration; fall back to hobby image
  const myPhotoSrc    = myUser.profilePhotoURL    || myUser.hobbyImageUrl    || '';
  const theirPhotoSrc = matchedUser.profilePhotoURL || matchedUser.hobbyImageUrl || '';

  const myImg = myPhotoSrc
    ? `<img src="${myPhotoSrc}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"/>`
    : `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-purple-300 to-blue-300 border-4 border-white shadow-lg flex items-center justify-center text-3xl">🎯</div>`;

  const theirImg = theirPhotoSrc
    ? `<img src="${theirPhotoSrc}" class="w-20 h-20 rounded-full object-cover border-4 border-white shadow-lg"/>`
    : `<div class="w-20 h-20 rounded-full bg-gradient-to-br from-pink-300 to-purple-300 border-4 border-white shadow-lg flex items-center justify-center text-3xl">🎯</div>`;

  const popup = document.createElement('div');
  popup.id = 'matchPopup';
  popup.className = 'fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/60 backdrop-blur-sm';
  popup.innerHTML = `
    <div class="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center animate-bounce-in">
      <div class="text-5xl mb-2">🎉</div>
      <h2 class="text-2xl font-black text-purple-900 mb-1">It's a Match!</h2>
      <p class="text-purple-600 mb-6">יש חיבור!</p>
      <div class="flex items-center justify-center gap-4 mb-6">
        ${myImg}
        <span class="text-3xl">🤝</span>
        ${theirImg}
      </div>
      <a href="https://wa.me/${formatWhatsApp(matchedUser.phone || '')}" target="_blank" rel="noopener noreferrer"
         class="flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl mb-3 transition"
         style="background:#d1fae5;color:#065f46;border:1.5px solid #a7f3d0;">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        שלח הודעה בווצאפ
      </a>
      <button onclick="document.getElementById('matchPopup').remove(); openChat('${matchedUser.email}', '${matchedUser.fullName.replace(/'/g, "\\'")}')"
        class="flex items-center justify-center gap-2 w-full font-bold py-3 rounded-xl mb-3 transition"
        style="background:#f5f3ff;color:#6d28d9;border:1.5px solid #ddd6fe;">
        💬 שלח הודעה בצ'אט
      </button>
      <button onclick="document.getElementById('matchPopup').remove()"
        class="w-full border border-purple-300 text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-50 transition">
        המשך לגלות
      </button>
    </div>`;
  document.body.appendChild(popup);
}

// ─── Image Lightbox ───────────────────────────────────────────────────────────

function openImageLightbox(url) {
  const existing = document.getElementById('imageLightbox');
  if (existing) existing.remove();

  const lb = document.createElement('div');
  lb.id = 'imageLightbox';
  lb.className = 'fixed inset-0 z-[70] flex items-center justify-center bg-black/85 backdrop-blur-sm p-4';
  lb.innerHTML = `
    <button onclick="document.getElementById('imageLightbox').remove()"
      class="absolute top-4 left-4 w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 text-white text-xl flex items-center justify-center transition">✕</button>
    <img src="${url}" class="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border border-white/10" alt="תמונה מוגדלת"/>`;
  lb.addEventListener('click', (e) => { if (e.target === lb) lb.remove(); });
  document.body.appendChild(lb);
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function renderEmpty(msg) {
  return `<div class="col-span-full text-center py-16 text-gray-400">
    <div class="text-5xl mb-4">🔍</div>
    <p class="text-lg font-semibold">${msg}</p>
  </div>`;
}


