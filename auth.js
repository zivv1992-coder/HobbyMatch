// ─── OTP ────────────────────────────────────────────────────────────────────

function generateOTP() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function saveOTP(otp) {
  const payload = { code: otp, expiry: Date.now() + 10 * 60 * 1000 };
  sessionStorage.setItem('hobbyMatchOTP', JSON.stringify(payload));
}

function verifyOTP(input) {
  const raw = sessionStorage.getItem('hobbyMatchOTP');
  if (!raw) return false;
  const { code, expiry } = JSON.parse(raw);
  if (Date.now() > expiry) {
    sessionStorage.removeItem('hobbyMatchOTP');
    return false;
  }
  if (input.trim() === code) {
    sessionStorage.removeItem('hobbyMatchOTP');
    return true;
  }
  return false;
}

async function sendOTP(email) {
  const otp = generateOTP();
  saveOTP(otp);

  if (IS_DEV_MODE) {
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`);
    alert(`[מצב פיתוח] קוד האימות שלך: ${otp}`);
    return;
  }

  // Production: send via EmailJS
  await emailjs.send(
    EMAILJS_CONFIG.serviceId,
    EMAILJS_CONFIG.otpTemplateId,
    { otp_code: otp, email: email }
  );
}

// ─── Session ─────────────────────────────────────────────────────────────────

function saveSession(userObj) {
  localStorage.setItem('hobbyMatchUser', JSON.stringify(userObj));
}

function getSession() {
  try {
    return JSON.parse(localStorage.getItem('hobbyMatchUser')) || null;
  } catch {
    return null;
  }
}

function clearSession() {
  localStorage.removeItem('hobbyMatchUser');
}

// ─── Redirect Guards ─────────────────────────────────────────────────────────

function requireSession() {
  if (!getSession()) {
    window.location.href = 'index.html';
  }
}

function redirectIfLoggedIn() {
  if (getSession()) {
    window.location.href = 'profiles.html';
  }
}
