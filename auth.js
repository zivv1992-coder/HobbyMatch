// ─── Sign-in (Firebase Auth) ────────────────────────────────────────────────
const LINK_EMAIL_KEY  = 'hobbyMatchLinkEmail';   // the address the link was sent to
const LINK_SEARCH_KEY = 'hobbyMatchLinkSearch';  // the page's query string, restored after the link

// Resolves with the signed-in Firebase user (or null) once Firebase has checked
function authReady() {
  return new Promise(resolve => {
    const off = firebase.auth().onAuthStateChanged(user => { off(); resolve(user); });
  });
}

// Firebase adds its own "mode" to the link, so the page's query string is kept here, not in the url
async function sendLoginLink(email) {
  firebase.auth().languageCode = 'he';
  await firebase.auth().sendSignInLinkToEmail(email, {
    url: new URL('register.html', location.href).href,
    handleCodeInApp: true
  });
  localStorage.setItem(LINK_EMAIL_KEY, email);
  localStorage.setItem(LINK_SEARCH_KEY, location.search);
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
    const returnTo = encodeURIComponent(window.location.href);
    window.location.href = 'index.html?returnTo=' + returnTo;
  }
}

function redirectIfLoggedIn() {
  if (getSession()) {
    window.location.href = 'profiles.html';
  }
}
