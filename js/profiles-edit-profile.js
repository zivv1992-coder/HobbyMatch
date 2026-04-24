// ══════════════════════════════════════════════════════════════════════════════
// profiles-edit-profile.js — Edit Profile drawer (open, save, gallery, photo)
// State lives in profiles-state.js: ed_isRomantic, ed_savedImages,
//   ed_newFiles, ed_profilePhotoFile
// ══════════════════════════════════════════════════════════════════════════════

function openEditDrawer() {
  const user = getSession();
  // Populate cities dropdown once
  const sel = document.getElementById('ed_city');
  if (sel.options.length <= 1) {
    sel.innerHTML = '<option value="">בחר עיר...</option>';
    CITIES.forEach(c => {
      const o = document.createElement('option');
      o.value = c.name;
      o.textContent = c.name;
      sel.appendChild(o);
    });
  }
  // Pre-fill fields
  document.getElementById('ed_name').value  = user.fullName || '';
  document.getElementById('ed_phone').value = (user.phone || '').replace(/\D/g, '');
  document.getElementById('ed_age').value   = user.age      || '';
  document.getElementById('ed_city').value  = user.city     || '';
  document.getElementById('ed_hobby').value = user.hobby    || '';
  document.getElementById('ed_desc').value  = user.hobbyDescription || '';
  document.getElementById('ed_email').value = user.email    || '';
  // Profile photo
  ed_profilePhotoFile = null;
  document.getElementById('ed_profile_photo').value = '';
  const ppWrap = document.getElementById('ed_profilePhotoWrap');
  if (user.profilePhotoURL) {
    ppWrap.innerHTML = `<img src="${user.profilePhotoURL}" class="w-full h-full object-cover"/>`;
  } else {
    ppWrap.innerHTML = `<svg viewBox="0 0 24 24" fill="#a78bfa" xmlns="http://www.w3.org/2000/svg" style="width:55%;height:55%;"><path d="M12 12c2.761 0 5-2.239 5-5s-2.239-5-5-5-5 2.239-5 5 2.239 5 5 5zm0 2c-3.314 0-10 1.657-10 5v2h20v-2c0-3.343-6.686-5-10-5z"/></svg>`;
  }
  // Images
  ed_savedImages = user.hobbyImages && user.hobbyImages.length
    ? [...user.hobbyImages]
    : (user.hobbyImageUrl ? [user.hobbyImageUrl] : []);
  ed_newFiles = [];
  ed_renderGallery();
  // Romantic toggle
  ed_isRomantic = !!user.romantic;
  ed_applyToggle();
  // Social Style + General Vibe
  const savedCustom = (user.socialStyle || '').split(',').map(s => s.trim()).filter(Boolean);
  ed_selectedSocialStyle = new Set(savedCustom.filter(s => SOCIAL_STYLE_TAGS.includes(s)));
  const customPart = savedCustom.filter(s => !SOCIAL_STYLE_TAGS.includes(s)).join(', ');
  document.getElementById('ed_social_style_custom').value = customPart;
  ed_selectedGeneralVibe = new Set((user.generalVibe || []).filter(s => GENERAL_VIBE_TAGS.includes(s)));
  ed_renderTagChips('ed_socialStyleTags',  SOCIAL_STYLE_TAGS, ed_selectedSocialStyle);
  ed_renderTagChips('ed_generalVibeTags',  GENERAL_VIBE_TAGS, ed_selectedGeneralVibe);
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

function ed_renderGallery() {
  const gallery = document.getElementById('ed_gallery');
  const total   = ed_savedImages.length + ed_newFiles.length;

  let html = '';
  ed_savedImages.forEach((url, i) => {
    html += `
      <div class="relative w-20 h-20 shrink-0">
        <img src="${url}" class="w-full h-full rounded-xl object-cover border-2 border-purple-200"/>
        <button onclick="ed_removeSaved(${i})"
          class="absolute -top-1.5 -left-1.5 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center leading-none hover:bg-red-600">✕</button>
      </div>`;
  });
  ed_newFiles.forEach((file, i) => {
    const url = URL.createObjectURL(file);
    html += `
      <div class="relative w-20 h-20 shrink-0">
        <img src="${url}" class="w-full h-full rounded-xl object-cover border-2 border-blue-200 opacity-80"/>
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
    wrap.innerHTML = `<img src="${e.target.result}" class="w-full h-full object-cover"/>`;
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
    const active = selectedSet.has(tag);
    btn.className = active
      ? 'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-purple-600 bg-purple-600 text-white transition'
      : 'px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-gray-200 bg-white text-gray-600 hover:border-purple-400 hover:text-purple-700 transition';
    btn.onclick = () => {
      if (selectedSet.has(tag)) selectedSet.delete(tag); else selectedSet.add(tag);
      ed_renderTagChips(containerId, tags, selectedSet);
    };
    container.appendChild(btn);
  });
}

function ed_toggleRomantic() {
  ed_isRomantic = !ed_isRomantic;
  ed_applyToggle();
}

function ed_applyToggle() {
  const track = document.getElementById('ed_romanticToggle');
  const thumb = document.getElementById('ed_toggleThumb');
  track.setAttribute('aria-checked', String(ed_isRomantic));
  if (ed_isRomantic) {
    track.style.background = 'linear-gradient(to left, #7c3aed, #2563eb)';
    thumb.style.right = 'auto';
    thumb.style.left  = '2px';
  } else {
    track.style.background = '';
    track.classList.add('bg-gray-300');
    thumb.style.left  = 'auto';
    thumb.style.right = '2px';
  }
}

async function handleSaveProfile() {
  const errEl   = document.getElementById('ed_error');
  const saveBtn = document.getElementById('ed_saveBtn');
  errEl.classList.add('hidden');

  const name  = document.getElementById('ed_name').value.trim();
  const phone = document.getElementById('ed_phone').value.trim();
  const age   = parseInt(document.getElementById('ed_age').value, 10);
  const city  = document.getElementById('ed_city').value;
  const hobby = document.getElementById('ed_hobby').value.trim();
  const desc  = document.getElementById('ed_desc').value.trim();
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
    const customSocialStyle = document.getElementById('ed_social_style_custom').value.trim();
    const socialStyleArr = [...ed_selectedSocialStyle];
    if (customSocialStyle) socialStyleArr.push(customSocialStyle);

    const updated = {
      ...current,
      fullName:         name,
      phone:            cleanPhone,
      age:              age,
      city:             city,
      hobby:            hobby,
      hobbyDescription: desc,
      romantic:         ed_isRomantic,
      socialStyle:      socialStyleArr.join(', '),
      generalVibe:      [...ed_selectedGeneralVibe],
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
