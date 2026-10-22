// ══════════════════════════════════════════════════════════════════════════════
// analytics.js — Anonymous sign-up funnel tracking → Firestore `analytics_events`
// No PII: a random visitor ID per browser, the traffic source, device type.
// Funnel: landing_view → register_view → signup_start → profile_form → profile_created
// Also: guest_browse (profiles.html without session), login (returning user).
// Results are shown in admin.html → "משפך הרשמה".
//
// Tag shared links with ?utm_source=<name> (e.g. ?utm_source=fb-running-tlv)
// to see which post / group brings people in.
// ══════════════════════════════════════════════════════════════════════════════

const ANALYTICS_DISABLED =
  location.protocol === 'file:' ||
  ['localhost', '127.0.0.1'].includes(location.hostname);

function an_storageGet(key) {
  try { return localStorage.getItem(key); } catch (_) { return null; }
}
function an_storageSet(key, val) {
  try { localStorage.setItem(key, val); } catch (_) {}
}

function an_visitorId() {
  let id = an_storageGet('hmVisitorId');
  if (!id) {
    id = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    an_storageSet('hmVisitorId', id);
  }
  return id;
}

// First-touch source: utm_source > external referrer host > "direct"
function an_source() {
  const saved = an_storageGet('hmSource');
  if (saved) return saved;
  const utm = new URLSearchParams(location.search).get('utm_source');
  let src = 'direct';
  if (utm) {
    src = utm.slice(0, 50);
  } else if (document.referrer) {
    try {
      const host = new URL(document.referrer).hostname.replace(/^www\./, '');
      if (host !== location.hostname) src = host;
    } catch (_) {}
  }
  an_storageSet('hmSource', src);
  return src;
}

// Fire-and-forget. Before a redirect, `await trackEvent(...)` — it never rejects
// and resolves after at most 1.5s so navigation is never blocked.
function trackEvent(event) {
  if (ANALYTICS_DISABLED) return Promise.resolve();
  try {
    const write = db.collection('analytics_events').add({
      event,
      visitorId: an_visitorId(),
      source:    an_source(),
      path:      location.pathname,
      device:    /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    }).catch(err => console.warn('שגיאה ברישום אירוע סטטיסטיקה', err));
    return Promise.race([write, new Promise(r => setTimeout(r, 1500))]);
  } catch (err) {
    console.warn('שגיאה ברישום אירוע סטטיסטיקה', err);
    return Promise.resolve();
  }
}

// Capture the source on the very first page the visitor lands on
an_source();
