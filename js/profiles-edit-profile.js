// ══════════════════════════════════════════════════════════════════════════════
// profiles-edit-profile.js — Edit Profile drawer (open, save, gallery, photo)
// State lives in profiles-state.js: ed_lookingFor, ed_savedImages,
//   ed_newFiles, ed_profilePhotoFile
// ══════════════════════════════════════════════════════════════════════════════

function openEditDrawer() {
  const user = getSession();
  if (!ed_cityPicker) ed_cityPicker = createCityPicker('ed_city', 'drawer-input bg-white');
  // Pre-fill fields
  document.getElementById('ed_name').value  = user.fullName || '';
  document.getElementById('ed_phone').value = (user.phone || '').replace(/\D/g, '');
  document.getElementById('ed_age').value   = user.age      || '';
  ed_cityPicker.setCity(user.city);
  if (!ed_hobbyPicker) ed_hobbyPicker = createHobbyPicker('ed_hobbyPicker');
  ed_hobbyPicker.setHobbies(getUserHobbies(user));
  document.getElementById('ed_desc').value      = user.hobbyDescription || '';
  document.getElementById('ed_email').value = user.email    || '';
  // Profile photo
  ed_profilePhotoFile = null;
  document.getElementById('ed_profile_photo').value = '';
  const ppWrap = document.getElementById('ed_profilePhotoWrap');
  if (user.profilePhotoURL) {
    ppWrap.innerHTML = `<img src="${user.profilePhotoURL}" class="w-full h-full object-cover cursor-zoom-in" onclick="openImageLightbox(this.src)"/>`;
  } else {
    ppWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="#a78bfa" xmlns="http://www.w3.org/2000/svg" style="width:55%;height:55%;"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-10 1.657-10 5v2h20v-2c0-3.343-6.686-5-10-5z"/></svg>`;
  }
  // Images
  ed_savedImages = user.hobbyImages && user.hobbyImages.length
    ? [...user.hobbyImages]
    : (user.hobbyImageUrl ? [user.hobbyImageUrl] : []);
  ed_newFiles = [];
  ed_renderGallery();
  // What I'm looking for — older profiles only have the `romantic` flag
  ed_lookingFor = new Set(Array.isArray(user.lookingFor) ? user.lookingFor : (user.romantic ? ['romantic'] : []));
  ed_renderLookingFor();
  ed_wantToTry = [...(user.wantToTry || [])];
  ed_renderWantToTry();
  // Show
  document.getElementById('ed_error').classList.add('hidden');
  document.getElementById('ed_image').value = '';
  document.getElementById('editOverlay').classList.remove('hidden');
  requestAnimationFrame(() => {
    const d = document.getElementById('editDrawer');
    d.style.transform = 'scale(1)';
    d.style.opacity   = '1';
  });
}

function closeEditDrawer() {
  const d = document.getElementById('editDrawer');
  d.style.transform = 'scale(.97)';
  d.style.opacity   = '0';
  setTimeout(() => {
    document.getElementById('editOverlay').classList.add('hidden');
  }, 220);
  document.getElementById('ed_image').value = '';
  document.getElementById('ed_profile_photo').value = '';
  ed_newFiles = [];
  ed_profilePhotoFile = null;
}

// Enlarge a gallery thumbnail; arrows page through the whole gallery (saved + new)
function ed_openGalleryImage(img) {
  const all = [...document.querySelectorAll('#ed_gallery img')];
  openImageLightbox(all.map(im => im.src), all.indexOf(img));
}

function ed_renderGallery() {
  const gallery = document.getElementById('ed_gallery');
  const total   = ed_savedImages.length + ed_newFiles.length;

  let html = '';
  ed_savedImages.forEach((url, i) => {
    html += `
      <div class="relative w-20 h-20 shrink-0">
        <img src="${url}" class="w-full h-full rounded-xl object-cover cursor-zoom-in border-2 border-purple-200" onclick="ed_openGalleryImage(this)"/>
        <button onclick="ed_removeSaved(${i})"
          class="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600">✕</button>
      </div>`;
  });
  ed_newFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    html += `
      <div class="relative w-20 h-20 shrink-0">
        <img src="${url}" class="w-full h-full rounded-xl object-cover cursor-zoom-in border-2 border-blue-200 opacity-80" onclick="ed_openGalleryImage(this)"/>
        <span class="absolute bottom-0.5 right-0.5 text-xs bg-blue-500 text-white px-1 rounded">חדשה</span>
        <button onclick="ed_removeNew(${i})"
          class="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600">✕</button>
      </div>`;
  });

  gallery.innerHTML = total === 0
    ? '<p class="text-sm text-gray-400">אין תמונות עדיין</p>'
    : html;
}

function ed_addImage(input) {
  const file = input.files[0];
  if (!file) return;
  ed_newFiles.push(file);
  input.value = '';
  ed_renderGallery();
}

function ed_removeSaved(index) {
  ed_savedImages.splice(index, 1);
  ed_renderGallery();
}

function ed_removeNew(index) {
  ed_newFiles.splice(index, 1);
  ed_renderGallery();
}

function ed_previewProfilePhoto(input) {
  const file = input.files[0];
  if (!file) return;
  ed_profilePhotoFile = file;
  const reader = new FileReader();
  reader.onload = e => {
    const wrap = document.getElementById('ed_profilePhotoWrap');
    wrap.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover cursor-zoom-in" onclick="openImageLightbox(this.src)"/>`;
  };
  reader.readAsDataURL(file);
}

function ed_renderTagChips(containerId, tags, selectedSet) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  tags.forEach(tag => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = tag;
    const idx = tags.indexOf(tag);
    const active = selectedSet.has(tag);
    btn.className = active ? getTagChipActiveClassByIndex(idx) : TAG_CHIP_INACTIVE_CLASS;
    btn.onclick = () => {
      if (selectedSet.has(tag)) selectedSet.delete(tag); else selectedSet.add(tag);
      ed_renderTagChips(containerId, tags, selectedSet);
    };
    container.appendChild(btn);
  });
}

function ed_renderLookingFor() {
  document.getElementById('ed_lookingFor').innerHTML = TAHBIVA.LOOKING.map(l =>
    `<button type="button" class="ed-look ${ed_lookingFor.has(l.id) ? 'on' : ''}" onclick="ed_toggleLooking('${l.id}')">${l.e} ${l.label}</button>`
  ).join('');
}

function ed_renderWantToTry() {
  document.getElementById('ed_wantToTry').innerHTML = ed_wantToTry.length
    ? ed_wantToTry.map((h, i) => `<span class="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-sm font-bold pl-1.5 pr-3 py-1 rounded-full">
        ${HOBBY_EMOJI[h] || '🤔'} ${escapeHtml(h)}
        <button type="button" onclick="ed_removeWantToTry(${i})" class="w-5 h-5 rounded-full bg-white/80 text-xs" aria-label="הסרה">✕</button></span>`).join('')
    : '<p class="text-sm text-gray-400">עוד אין</p>';
}

function ed_addWantToTry(e) {
  e.preventDefault();
  const input = document.getElementById('ed_wantToTryInput');
  const v = input.value.replace(/\s+/g, ' ').trim();
  if (v && !ed_wantToTry.includes(v)) ed_wantToTry.push(v);
  input.value = '';
  ed_renderWantToTry();
}

function ed_removeWantToTry(i) {
  ed_wantToTry.splice(i, 1);
  ed_renderWantToTry();
}

function ed_toggleLooking(id) {
  if (ed_lookingFor.has(id)) ed_lookingFor.delete(id); else ed_lookingFor.add(id);
  ed_renderLookingFor();
}

async function handleSaveProfile() {
  const errEl   = document.getElementById('ed_error');
  const saveBtn = document.getElementById('ed_saveBtn');
  errEl.classList.add('hidden');

  const name  = document.getElementById('ed_name').value.trim();
  const phone = document.getElementById('ed_phone').value.trim();
  const age   = parseInt(document.getElementById('ed_age').value, 10);
  const city  = document.getElementById('ed_city').value;
  const hobbies = ed_hobbyPicker.getHobbies();
  const hobby   = hobbies.join(', ');
  const desc      = document.getElementById('ed_desc').value.trim();
  const interests = desc;
  if (!name || !phone || !age || !city || !hobby) {
    errEl.textContent = 'אנא מלא את כל שדות החובה (*)';
    errEl.classList.remove('hidden');
    return;
  }
  if (age < 18 || age > 99) {
    errEl.textContent = 'גיל חייב להיות בין 18 ל-99';
    errEl.classList.remove('hidden');
    return;
  }

  let cleanPhone;
  try {
    cleanPhone = sanitizePhone(phone);
  } catch (e) {
    errEl.textContent = e.message;
    errEl.classList.remove('hidden');
    return;
  }

  saveBtn.disabled = true;
  saveBtn.innerHTML = 'שומר...<span class="spinner"></span>';

  try {
    const current = getSession();
    // Upload any new hobby images
    const uploadedUrls = await Promise.all(
      ed_newFiles.map((file, i) =>
        uploadHobbyImageIndexed(file, current.email, ed_savedImages.length + i)
      )
    );
    const hobbyImages = [...ed_savedImages, ...uploadedUrls];

    // Upload new profile photo if chosen
    let profilePhotoUrl = current.profilePhotoURL || '';
    if (ed_profilePhotoFile) {
      profilePhotoUrl = await uploadProfilePhoto(ed_profilePhotoFile, current.email);
    }

    const cityData = CITIES.find(c => c.name === city);
    const updated = {
      ...current,
      fullName:         name,
      phone:            cleanPhone,
      age:              age,
      city:             city,
      hobby:            hobby,
      hobbies:          hobbies,
      hobbyDescription: desc,
      interests:        interests,
      lookingFor:       [...ed_lookingFor],
      wantToTry:        [...ed_wantToTry],
      romantic:         ed_lookingFor.has('romantic'),   // kept for the badge + discover filter
      hobbyImages:      hobbyImages,
      hobbyImageUrl:    hobbyImages[0] || '',
      profilePhotoURL:  profilePhotoUrl,
      latitude:         cityData ? cityData.lat : current.latitude,
      longitude:        cityData ? cityData.lng : current.longitude
    };

    await updateProfileInFirestore(updated);
    saveSession(updated);
    Object.assign(me, updated);
    document.getElementById('navName').textContent = updated.fullName;

    closeEditDrawer();
    showToast();
  } catch (err) {
    errEl.textContent = 'שגיאה בשמירת הפרופיל. נסה שוב.';
    errEl.classList.remove('hidden');
    console.error(err);
  } finally {
    saveBtn.disabled = false;
    saveBtn.innerHTML = 'שמור שינויים';
  }
}
