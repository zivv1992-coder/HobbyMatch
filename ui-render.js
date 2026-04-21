// ─── Profile Card ─────────────────────────────────────────────────────────────

const HEART_FILLED = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6"><path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z"/></svg>`;
const HEART_OUTLINE = `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.8" stroke="currentColor" class="w-6 h-6"><path stroke-linecap="round" stroke-linejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"/></svg>`;

function renderCard(user, isLiked, myUser) {
  const dist = (myUser && myUser.latitude && user.latitude)
    ? Math.round(distanceKm(myUser.latitude, myUser.longitude, user.latitude, user.longitude))
    : null;

  // Avatar: profile photo → gradient initials fallback
  const initials = (user.fullName || '?').trim()[0].toUpperCase();
  const avatarHtml = user.profilePhotoURL
    ? `<img src="${user.profilePhotoURL}" class="w-10 h-10 rounded-full object-cover ring-2 ring-purple-100 shrink-0" alt=""/>`
    : `<div class="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white font-black text-base ring-2 ring-purple-100 shrink-0">${initials}</div>`;

  // Post image
  const imgHtml = user.hobbyImageUrl
    ? `<img src="${user.hobbyImageUrl}" alt="תמונת תחביב" class="w-full aspect-[4/5] object-cover"/>`
    : `<div class="w-full aspect-[4/5] bg-gradient-to-br from-purple-50 to-blue-50 flex items-center justify-center text-6xl">🎯</div>`;

  // Like button
  const heartBtnClass = isLiked
    ? 'flex items-center gap-1.5 transition-transform active:scale-90 text-red-500'
    : 'flex items-center gap-1.5 transition-transform active:scale-90 text-gray-400 hover:text-red-400';

  const romanticBadge = user.romantic
    ? `<span class="inline-flex items-center gap-1 bg-pink-50 text-pink-500 text-xs font-semibold px-2.5 py-1 rounded-full border border-pink-100">❤️ פתוח/ה לקשר רומנטי</span>`
    : '';

  return `
    <div class="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
         data-email="${user.email}">

      <!-- Post Header -->
      <div class="flex items-center gap-3 px-4 py-3 cursor-pointer"
           onclick="showProfileModal(${JSON.stringify(user).replace(/"/g, '&quot;')}, ${isLiked}, ${JSON.stringify(myUser).replace(/"/g, '&quot;')})">
        ${avatarHtml}
        <div class="flex-1 min-w-0">
          <p class="font-bold text-gray-900 text-sm leading-tight">${user.fullName}, ${user.age}</p>
          <p class="text-xs text-gray-400 mt-0.5">📍 ${user.city}${dist !== null ? ` · ${dist} ק"מ` : ''}</p>
        </div>
        ${user.romantic ? `<span class="text-base shrink-0" title="פתוח/ה לקשר רומנטי">❤️</span>` : ''}
      </div>

      <!-- Post Image -->
      <div class="relative cursor-pointer"
           onclick="showProfileModal(${JSON.stringify(user).replace(/"/g, '&quot;')}, ${isLiked}, ${JSON.stringify(myUser).replace(/"/g, '&quot;')})">
        ${imgHtml}
        <div class="absolute bottom-3 right-3 flex flex-wrap gap-1 justify-end max-w-[90%]">
          ${(user.hobby || '').split(',').map(h => h.trim()).filter(Boolean).slice(0, 3)
            .map(h => `<span class="bg-black/50 backdrop-blur-sm text-white text-xs font-semibold px-2.5 py-1 rounded-full">#${h}</span>`)
            .join('')}
        </div>
      </div>

      <!-- Actions & Caption -->
      <div class="px-4 pt-3 pb-4 flex flex-col gap-2">
        <button
          class="${heartBtnClass}"
          onclick="event.stopPropagation(); handleLike('${user.email}', '${user.fullName}', this)"
          data-liked="${isLiked}"
        >${isLiked ? HEART_FILLED : HEART_OUTLINE}<span class="like-label text-sm font-semibold">${isLiked ? 'ביטול לייק' : 'לייק'}</span></button>
        ${user.hobbyDescription ? `<p class="text-gray-600 text-sm leading-relaxed line-clamp-2">${user.hobbyDescription}</p>` : ''}
        ${romanticBadge}
      </div>
    </div>`;
}

// ─── Profile Modal ────────────────────────────────────────────────────────────

function showProfileModal(user, isLiked, myUser) {
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

  // Images — support future array, currently single
  const images = user.hobbyImages && user.hobbyImages.length
    ? user.hobbyImages
    : (user.hobbyImageUrl ? [user.hobbyImageUrl] : []);

  const imagesHtml = images.length
    ? images.map(url =>
        `<img src="${url}" class="w-full rounded-2xl object-cover max-h-36" alt="תמונת תחביב"/>`
      ).join('')
    : `<div class="w-full h-28 rounded-2xl bg-gradient-to-br from-purple-200 to-blue-200 flex items-center justify-center text-5xl">🎯</div>`;

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
      <div class="px-5 flex flex-col gap-2 mt-2">
        ${imagesHtml}
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
          <p class="text-xs font-bold text-gray-400 uppercase mb-1">על עצמי</p>
          <p class="text-gray-600 text-sm leading-relaxed">${user.hobbyDescription}</p>
        </div>` : ''}

        <!-- Badges -->
        ${romanticBadge ? `<div>${romanticBadge}</div>` : ''}

        <!-- Like button -->
        <button
          id="modalLikeBtn"
          class="w-full py-3 rounded-xl font-bold text-sm transition ${likedClass}"
          onclick="handleModalLike('${user.email}', '${user.fullName}', this)"
          data-liked="${isLiked}"
        >${likedText}</button>
      </div>
    </div>`;

  modal.addEventListener('click', () => modal.remove());
  document.body.appendChild(modal);
}

// ─── Match Card (My Matches tab) ──────────────────────────────────────────────

function formatWhatsApp(phone) {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('972')) return digits;
  if (digits.startsWith('0'))   return '972' + digits.slice(1);
  return '972' + digits;
}

function renderMatchCard(user) {
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
  return `
    <div class="bg-white rounded-2xl shadow-md p-4 flex items-center gap-4">
      ${imgHtml}
      <div class="flex-1 min-w-0">
        <p class="font-black text-purple-900">${user.fullName}</p>
        <p class="text-sm text-gray-500">📍 ${user.city} · 🎯 ${user.hobby}</p>
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
      <p class="text-gray-700 font-semibold mb-6">אתה ו-${matchedUser.fullName} — שווה ליצור קשר!</p>
      <a href="https://wa.me/${formatWhatsApp(matchedUser.phone || '')}" target="_blank" rel="noopener noreferrer"
         class="flex items-center justify-center gap-2 w-full bg-[#25D366] text-white font-bold py-3 rounded-xl mb-3 hover:bg-[#1ebe5d] transition">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.103 1.523 5.83L.057 23.57a.5.5 0 0 0 .611.611l5.74-1.466A11.945 11.945 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22a9.944 9.944 0 0 1-5.073-1.386l-.363-.215-3.761.961.977-3.762-.232-.375A9.944 9.944 0 0 1 2 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
        שלח WhatsApp ל-${matchedUser.fullName}
      </a>
      <button onclick="document.getElementById('matchPopup').remove()"
        class="w-full border border-purple-300 text-purple-700 font-bold py-3 rounded-xl hover:bg-purple-50 transition">
        המשך לגלות
      </button>
    </div>`;
  document.body.appendChild(popup);
}

// ─── Empty States ──────────────────────────────────────────────────────────────

function renderEmpty(msg) {
  return `<div class="col-span-full text-center py-16 text-gray-400">
    <div class="text-5xl mb-4">🔍</div>
    <p class="text-lg font-semibold">${msg}</p>
  </div>`;
}
