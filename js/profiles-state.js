// ══════════════════════════════════════════════════════════════════════════════
// profiles-state.js — Single source of truth for all app state
// All other modules READ from / WRITE to these variables only.
// Never re-declare these variables in other files.
// ══════════════════════════════════════════════════════════════════════════════

// ── Session (set once on page load) ──────────────────────────────────────────
const me = getSession(); // null for guests with ?event= deep-link

// ── Discover feed ─────────────────────────────────────────────────────────────
let allUsers         = [];
let likedEmails      = new Set();
let activeTab        = 'discover';
let radiusKm         = 50;
let _romanticFilterOn = false;

// ── Lazy-load ─────────────────────────────────────────────────────────────────
const LAZY_PAGE_SIZE = 12;
let _lazyFiltered = [];
let _lazyShown    = 0;
let _lazyObserver = null;

// ── Events ────────────────────────────────────────────────────────────────────
let allEventsData = [];
let eventsLoaded  = false;
let eventFilter   = 'all';

// ── Edit Profile drawer ───────────────────────────────────────────────────────
let ed_isRomantic       = false;
let ed_savedImages      = [];   // existing URLs from Firestore
let ed_newFiles         = [];   // File objects waiting to be uploaded
let ed_profilePhotoFile = null; // new profile photo file

// ── Attendee circle gradient colours (used by events + detail modal) ─────────
const CIRCLE_COLORS = [
  'from-purple-400 to-blue-500',
  'from-pink-400 to-rose-500',
  'from-emerald-400 to-teal-500',
  'from-amber-400 to-orange-500',
  'from-violet-400 to-indigo-500'
];

// ── Notifications / FCM ───────────────────────────────────────────────────────
let _fcmMessaging    = null;
const _seenKey       = me ? `kn_seen_matches_${me.email}` : '';
let _seenMatchEmails = new Set(JSON.parse(localStorage.getItem(_seenKey) || '[]'));
let _currentMatches  = [];
let _notifPanelOpen  = false;
let _matchUnsub      = null;

// ── Discovery section ─────────────────────────────────────────────────────────
let _discHobbiesPool = [];
let _discEventsPool  = [];
let _discHobbiesOff  = 0;
let _discEventsOff   = 0;

// ── Chat ──────────────────────────────────────────────────────────────────────
let _chatUnsub         = null;
let _chatOtherEmail    = null;
const _matchChatUnsubs = {};  // chatId → unsubscribe fn  (background listeners)
const _unreadCounts    = {};  // chatId → unread count
