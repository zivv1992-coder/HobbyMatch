// ─── Firebase Config ───────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyC38cgju5tJk8orJhDZlXLFLuNQBcET1n8",
  authDomain:        "hobby-connection-adaca.firebaseapp.com",
  projectId:         "hobby-connection-adaca",
  storageBucket:     "hobby-connection-adaca.firebasestorage.app",
  messagingSenderId: "864875672697",
  appId:             "1:864875672697:web:298b2927ad26f5c0ff90a8"
};

firebase.initializeApp(firebaseConfig);
const db      = firebase.firestore();
const storage = firebase.storage();

// ─── Firebase Cloud Messaging — VAPID Key ───────────────────────────────────
const FCM_VAPID_KEY = "BJ9FYrOsn301Wfq9tA6em9wfQO8sQH3Ku13ksh7Blc9s45WLNbPRZo68Ip3bKTECpzGqQ0UoTjDlvdgEGLixk2I";

// ─── Admin ──────────────────────────────────────────────────────────────────
// Replace with the email address of the admin user
const ADMIN_EMAIL = 'zivv1992@gmail.com';

// ─── Dev Mode ───────────────────────────────────────────────────────────────
// Set to false before deploying to production
const IS_DEV_MODE = false;

// ─── EmailJS Config ─────────────────────────────────────────────────────────
const EMAILJS_CONFIG = {
  serviceId:     'service_9p6dx8n',
  otpTemplateId: 'template_ajwgbh9',
  publicKey:     'WJ8SooBxHjs4CX0Vo'
};

// ─── Event Hobbies Dropdown ──────────────────────────────────────────────────
const EVENT_HOBBIES = [
  'כדורסל 🏀', 'כדורגל ⚽', 'ריצה 🏃', 'יוגה 🧘', 'צילום 📸',
  'ציור 🎨', 'בישול 🍳', 'גיטרה 🎸', 'שחייה 🏊', 'טיפוס 🧗',
  'ריקוד 💃', 'קריאה 📚', 'גינון 🌱', 'שחמט ♟️', 'כדורעף 🏐',
  'רכיבה 🚴', 'קפה ☕', 'טיולים 🥾', 'מוזיקה 🎵', 'קולנוע 🎬',
  'כדורתופת 🎳', 'אומנות לחימה 🥋', 'סרוגה 🧶', 'לגו 🧱', 'פודקאסט 🎙️',
  'אחר 🎯'
];

// ─── Activity Categories (two-level tree for event creation chips) ────────────
const ACTIVITY_CATEGORIES = [
  { label: '⚽ ספורט קבוצתי', tags: ['כדורסל', 'כדורגל', 'כדורעף', 'טניס', 'ספורט כללי'] },
  { label: '🏃 ספורט אישי',   tags: ['ריצה', 'שחייה', 'פיטנס', 'אומנות לחימה', 'טיפוס', 'רכיבה על אופניים'] },
  { label: '🧘 בריאות ורוח',  tags: ['יוגה', 'מדיטציה', 'הליכה וטיולים'] },
  { label: '🎨 אמנות ויצירה', tags: ['מוזיקה', 'ריקוד', 'אמנות', 'צילום', 'קולנוע'] },
  { label: '🍽️ אוכל ובילוי',  tags: ['בישול', 'אוכל ומסעדות', 'קפה'] },
  { label: '📚 תרבות וידע',   tags: ['קריאה', 'טכנולוגיה', 'התנדבות'] },
  { label: '🎮 משחקים',       tags: ['גיימינג', 'משחקי לוח'] },
];

// ─── Activity Tags flat list (kept for ATMOSPHERE_MAP compatibility) ──────────
const ACTIVITY_TAGS = ACTIVITY_CATEGORIES.flatMap(c => c.tags);

// ─── Atmosphere chips per activity tag ───────────────────────────────────────
const ATMOSPHERE_MAP = {
  'הליכה וטיולים':    ['אתגרי', 'נגיש לכולם', 'משפחות', 'צילום טבע', 'מתחילים', 'ותיקים'],
  'ריצה':             ['סיבוב קליל', 'אינטרוולים', 'מרתון', 'מתחילים', 'תחרותי'],
  'רכיבה על אופניים': ['שטח', 'כביש', 'עיר', 'קליל', 'אתגרי'],
  'שחייה':            ['בריכה', 'ים', 'קליל', 'אינטנסיבי', 'מתחילים'],
  'ספורט כללי':       ['אינטנסיבי', 'קליל', 'תחרותי', 'כיפי', 'מתחילים'],
  'כדורסל':           ['3x3', '5x5', 'חצי מגרש', 'חברות', 'תחרותי'],
  'כדורגל':           ['5 שחקנים', '7 שחקנים', '11 שחקנים', 'חברות', 'תחרותי'],
  'טניס':             ['זוגות', 'יחיד', 'מתחילים', 'מנוסים', 'חברות'],
  'כדורעף':           ['חוף', 'אולם', 'מתחילים', 'תחרותי', 'חברות'],
  'טיפוס':            ['מסלול קל', 'מסלול בינוני', 'מסלול קשה', 'מקורה', 'חיצוני'],
  'יוגה':             ['מתחילים', 'מתקדמים', 'הרפיה', 'דינמי', 'שחר', 'שקיעה'],
  'מדיטציה':          ['מתחילים', 'מנוסים', 'מודרך', 'שקט', 'בוקר'],
  'פיטנס':            ['חדר כושר', 'חיצוני', 'HIIT', 'כוח', 'קרדיו', 'מתחילים'],
  'אומנות לחימה':     ['בוקסינג', 'קראטה', 'קראב מאגה', 'מתחילים', 'מנוסים'],
  'מוזיקה':           ['ג\'אם', 'סשן', 'הופעה', 'חזרה', 'מתחילים', 'מנוסים'],
  'ריקוד':            ['סלסה', 'היפ-הופ', 'בלט', 'חברותי', 'מתחילים'],
  'קולנוע':           ['בחוץ', 'בית קולנוע', 'דיון אחרי', 'קלאסיקות', 'עכשווי'],
  'אמנות':            ['סדנה', 'שיעור', 'חופשי', 'מתחילים', 'מנוסים'],
  'צילום':            ['נוף', 'עירוני', 'פורטרט', 'לילה', 'מתחילים'],
  'קריאה':            ['מועדון ספרים', 'ז\'אנר מסוים', 'דיון', 'חיצוני', 'בית קפה'],
  'בישול':            ['סדנה', 'ארוחה משותפת', 'מטבח ספציפי', 'מתחילים', 'שף אורח'],
  'אוכל ומסעדות':     ['מסעדה חדשה', 'רחוב אוכל', 'שוק', 'מטבח ספציפי', 'חברותי'],
  'קפה':       ['בית קפה', 'קפה מיוחד', 'שיחה חופשית', 'עבודה משותפת', 'חברותי'],
  'טכנולוגיה':        ['האקתון', 'מיטאפ', 'סדנה', 'למידה', 'רשת קשרים'],
  'גיימינג':          ['PC', 'קונסול', 'לוח', 'VR', 'תחרות', 'חברותי'],
  'משחקי לוח':        ['אסטרטגיה', 'קלפים', 'שיתופי', 'תחרותי', 'חברותי', 'קל'],
  'התנדבות':          ['חיצוני', 'קהילתי', 'ילדים', 'קשישים', 'בעלי חיים', 'אקולוגיה'],
  'אחר':              ['פתוח לכולם', 'מתחילים', 'מנוסים', 'חברותי', 'אינטנסיבי'],
};

// ─── Social Style Tags — HOW the user likes to meet ────────────────────────
const SOCIAL_STYLE_TAGS = [
  'מארח/ת ארוחות שישי', 'שותף/ה לריקוד', 'בילויים שקטים בבית',
  'הרפתקאות בחוץ', 'קפה ושיחות', 'פעילות ספורטיבית משותפת',
  'סופשבוע בטבע', 'אירועי תרבות', 'ליל משחקי קופסה', 'בישול יחד',
  'שוטטות בעיר', 'נסיעות וטיולים', 'בילוי בים', 'ספא ורגיעה'
];

// ─── General Vibe Tags — lifestyle traits ────────────────────────────────────
const GENERAL_VIBE_TAGS = [
  'אוהב/ת בירה', 'אדם שקט', 'בן אדם של בוקר', 'לילי/ת', 'אוהב/ת מסיבות',
  'חובב/ת טבע', 'ביתי/ת', 'חברותי/ת', 'מוזיקה תמיד', 'יש לי כלב',
  'יש לי חתול', 'ספורטאי/ת', 'גורמה', 'חובב/ת אמנות', 'טכנולוג/ית',
  'מדיטציה ומיינדפולנס', 'ברים ומסעדות', 'נסיעות לחו"ל'
];

// ─── Shared multi-select chip styles (index in list = distinct color) ───────
const TAG_CHIP_INACTIVE_CLASS =
  'px-3 py-1.5 rounded-full text-xs font-semibold border-2 border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50 transition';

/** Selected chips: soft palette — purple, blue, green, yellow (cycles by index) */
const TAG_CHIP_ACTIVE_CLASSES = [
  'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-purple-300 bg-white text-purple-700 shadow-sm transition',
  'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-blue-300 bg-white text-blue-700 shadow-sm transition',
  'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-emerald-300 bg-white text-emerald-700 shadow-sm transition',
  'px-3 py-1.5 rounded-full text-xs font-bold border-2 border-amber-300 bg-white text-amber-800 shadow-sm transition',
];

function getTagChipActiveClassByIndex(i) {
  return TAG_CHIP_ACTIVE_CLASSES[i % TAG_CHIP_ACTIVE_CLASSES.length];
}

function escapeTagDisplayText(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
}

/** Read-only badges for cards/modals — same palette as interactive chips */
function formatColoredTagBadgesHtml(labels) {
  if (!labels || !labels.length) return '';
  const list = Array.isArray(labels)
    ? labels.filter(Boolean)
    : String(labels).split(',').map(t => t.trim()).filter(Boolean);
  return list
    .map((label, i) => {
      const active = getTagChipActiveClassByIndex(i);
      const compact = active.replace('px-3 py-1.5', 'px-2.5 py-1');
      return `<span class="inline-flex items-center ${compact}">${escapeTagDisplayText(label)}</span>`;
    })
    .join('<span class="inline-block w-1.5" aria-hidden="true"></span>');
}

/** Union of atmosphere chip labels for all selected ACTIVITY_TAGS keys */
function mergeAtmosphereOptionsForActivities(selectedActivities) {
  const out = [];
  const seen = new Set();
  (selectedActivities || []).forEach(act => {
    const opts = ATMOSPHERE_MAP[act];
    if (!opts) return;
    opts.forEach(o => {
      if (!seen.has(o)) {
        seen.add(o);
        out.push(o);
      }
    });
  });
  return out;
}

// ─── Israeli Cities — sorted alphabetically (aleph-bet) ─────────────────────
const CITIES = [
  { name: 'אבו גוש',              lat: 31.8094, lng: 35.1072 },
  { name: 'אבן יהודה',            lat: 32.2644, lng: 34.8903 },
  { name: 'אום אל-פחם',           lat: 32.5167, lng: 35.1500 },
  { name: 'אופקים',               lat: 31.3125, lng: 34.6183 },
  { name: 'אור יהודה',            lat: 32.0269, lng: 34.8597 },
  { name: 'אור עקיבא',            lat: 32.5089, lng: 34.9172 },
  { name: 'אילת',                 lat: 29.5581, lng: 34.9482 },
  { name: 'אלעד',                 lat: 32.0533, lng: 34.9500 },
  { name: 'אפרת',                 lat: 31.6586, lng: 35.1556 },
  { name: 'אשדוד',                lat: 31.8014, lng: 34.6436 },
  { name: 'אשקלון',               lat: 31.6688, lng: 34.5743 },
  { name: 'באקה אל-גרביה',        lat: 32.4208, lng: 35.0358 },
  { name: 'באר שבע',              lat: 31.2518, lng: 34.7915 },
  { name: 'בית שאן',              lat: 32.5000, lng: 35.5000 },
  { name: 'בית שמש',              lat: 31.7519, lng: 34.9831 },
  { name: 'ביתר עילית',           lat: 31.6972, lng: 35.1161 },
  { name: 'בני ברק',              lat: 32.0833, lng: 34.8333 },
  { name: 'בת ים',                lat: 32.0236, lng: 34.7497 },
  { name: 'גבעת שמואל',           lat: 32.0792, lng: 34.8500 },
  { name: 'גבעתיים',              lat: 32.0706, lng: 34.8102 },
  { name: 'גדרה',                 lat: 31.8119, lng: 34.7783 },
  { name: 'גן יבנה',              lat: 31.7892, lng: 34.7064 },
  { name: 'גני תקווה',            lat: 32.0608, lng: 34.8742 },
  { name: "ג'דיידה-מכר",          lat: 32.9278, lng: 35.1536 },
  { name: "ג'לג'וליה",            lat: 32.1567, lng: 34.9578 },
  { name: "ג'סר א-זרקא",          lat: 32.5319, lng: 34.9106 },
  { name: "ג'ת",                  lat: 32.4033, lng: 35.0797 },
  { name: 'דאלית אל-כרמל',        lat: 32.6927, lng: 35.0472 },
  { name: 'דימונה',               lat: 31.0691, lng: 35.0317 },
  { name: 'דיר אל-אסד',           lat: 32.9397, lng: 35.2653 },
  { name: 'הוד השרון',            lat: 32.1522, lng: 34.8920 },
  { name: 'הרצליה',               lat: 32.1663, lng: 34.8436 },
  { name: 'זכרון יעקב',           lat: 32.5711, lng: 34.9497 },
  { name: 'חדרה',                 lat: 32.4344, lng: 34.9197 },
  { name: 'חולון',                lat: 32.0167, lng: 34.7667 },
  { name: 'חיפה',                 lat: 32.7940, lng: 34.9896 },
  { name: 'חצור הגלילית',         lat: 33.0183, lng: 35.5500 },
  { name: 'טבריה',                lat: 32.7940, lng: 35.5308 },
  { name: 'טייבה',                lat: 32.2683, lng: 34.9964 },
  { name: 'טירה',                 lat: 32.2319, lng: 34.9514 },
  { name: 'טירת כרמל',            lat: 32.7667, lng: 34.9667 },
  { name: 'טמרה',                 lat: 32.8594, lng: 35.1944 },
  { name: 'יבנה',                 lat: 31.8761, lng: 34.7392 },
  { name: 'יהוד',                 lat: 32.0317, lng: 34.8883 },
  { name: 'יוקנעם עילית',         lat: 32.6619, lng: 35.1044 },
  { name: 'יפיע',                 lat: 32.6783, lng: 35.2822 },
  { name: 'ירוחם',                lat: 30.9869, lng: 34.9283 },
  { name: 'ירושלים',              lat: 31.7683, lng: 35.2137 },
  { name: 'כאבול',                lat: 32.8622, lng: 35.2236 },
  { name: 'כסיפה',                lat: 31.3214, lng: 34.8764 },
  { name: 'כפר סבא',              lat: 32.1789, lng: 34.9076 },
  { name: 'כפר קאסם',             lat: 32.1136, lng: 34.9750 },
  { name: 'כפר שמריהו',           lat: 32.1961, lng: 34.8394 },
  { name: 'כרמיאל',               lat: 32.9167, lng: 35.3000 },
  { name: 'לוד',                  lat: 31.9528, lng: 34.8954 },
  { name: "מג'דל שמס",            lat: 33.2694, lng: 35.7681 },
  { name: 'מגאר',                 lat: 32.8897, lng: 35.4017 },
  { name: 'מגדל העמק',            lat: 32.6750, lng: 35.2383 },
  { name: 'מבשרת ציון',           lat: 31.8058, lng: 35.1461 },
  { name: 'מודיעין-מכבים-רעות',   lat: 31.8969, lng: 35.0095 },
  { name: 'מזכרת בתיה',           lat: 31.8597, lng: 34.7753 },
  { name: 'מטולה',                lat: 33.2689, lng: 35.5719 },
  { name: 'מעלה אדומים',          lat: 31.7731, lng: 35.2986 },
  { name: 'מעלות-תרשיחא',         lat: 33.0167, lng: 35.2833 },
  { name: 'מצפה רמון',            lat: 30.6100, lng: 34.8011 },
  { name: 'משהד',                 lat: 32.7431, lng: 35.3347 },
  { name: 'נהריה',                lat: 33.0050, lng: 35.0980 },
  { name: 'נוף הגליל',            lat: 32.7005, lng: 35.3339 },
  { name: 'נס ציונה',             lat: 31.9303, lng: 34.7969 },
  { name: 'נצרת',                 lat: 32.6996, lng: 35.3035 },
  { name: 'נשר',                  lat: 32.7667, lng: 35.0333 },
  { name: 'נתיבות',               lat: 31.4208, lng: 34.5883 },
  { name: 'נתניה',                lat: 32.3215, lng: 34.8532 },
  { name: 'סחנין',                lat: 32.8653, lng: 35.2906 },
  { name: 'עכו',                  lat: 32.9228, lng: 35.0780 },
  { name: 'עפולה',                lat: 32.6074, lng: 35.2898 },
  { name: 'ערד',                  lat: 31.2583, lng: 35.2122 },
  { name: 'ערערה',                lat: 32.4997, lng: 35.0531 },
  { name: 'עתלית',                lat: 32.6933, lng: 34.9417 },
  { name: 'פרדס חנה-כרכור',       lat: 32.4742, lng: 34.9612 },
  { name: 'פתח תקווה',            lat: 32.0840, lng: 34.8878 },
  { name: 'צפת',                  lat: 32.9645, lng: 35.4955 },
  { name: 'קדימה-צורן',           lat: 32.2747, lng: 34.9197 },
  { name: 'קיסריה',               lat: 32.5014, lng: 34.9000 },
  { name: 'קלנסווה',              lat: 32.2836, lng: 34.9803 },
  { name: 'קצרין',                lat: 32.9936, lng: 35.6917 },
  { name: 'קרית אונו',            lat: 32.0597, lng: 34.8622 },
  { name: 'קריית אתא',            lat: 32.8167, lng: 35.1000 },
  { name: 'קריית ביאליק',         lat: 32.8333, lng: 35.0833 },
  { name: 'קריית גת',             lat: 31.6100, lng: 34.7640 },
  { name: 'קריית טבעון',          lat: 32.7167, lng: 35.1167 },
  { name: 'קריית ים',             lat: 32.8500, lng: 35.0667 },
  { name: 'קריית מוצקין',         lat: 32.8458, lng: 35.0736 },
  { name: 'קריית מלאכי',          lat: 31.7328, lng: 34.7358 },
  { name: 'קריית שמונה',          lat: 33.2083, lng: 35.5694 },
  { name: 'ראש העין',             lat: 32.0958, lng: 34.9572 },
  { name: 'ראש פינה',             lat: 32.9717, lng: 35.5472 },
  { name: 'ראשון לציון',          lat: 31.9730, lng: 34.7925 },
  { name: 'רהט',                  lat: 31.3931, lng: 34.7542 },
  { name: 'רחובות',               lat: 31.8928, lng: 34.8113 },
  { name: 'ריינה',                lat: 32.7072, lng: 35.3106 },
  { name: 'רמלה',                 lat: 31.9296, lng: 34.8675 },
  { name: 'רמת גן',               lat: 32.0833, lng: 34.8167 },
  { name: 'רמת השרון',            lat: 32.1469, lng: 34.8397 },
  { name: 'רמת ישי',              lat: 32.7044, lng: 35.1675 },
  { name: 'רעננה',                lat: 32.1839, lng: 34.8706 },
  { name: 'שדרות',                lat: 31.5247, lng: 34.5983 },
  { name: 'שוהם',                 lat: 31.9936, lng: 34.9402 },
  { name: 'שלומי',                lat: 33.0694, lng: 35.1472 },
  { name: 'שפרעם',                lat: 32.8083, lng: 35.1667 },
  { name: 'תל אביב',              lat: 32.0853, lng: 34.7818 },
  { name: 'תל שבע',               lat: 31.2578, lng: 34.8261 },

  // קיבוצים
  { name: 'אפיקים',               lat: 32.6833, lng: 35.5667 },
  { name: 'אשדות יעקב',           lat: 32.6583, lng: 35.5833 },
  { name: 'בארי',                  lat: 31.4000, lng: 34.3167 },
  { name: 'בית אלפא',             lat: 32.5167, lng: 35.4167 },
  { name: 'בית השיטה',            lat: 32.5333, lng: 35.4333 },
  { name: 'בית זרע',              lat: 32.7167, lng: 35.5833 },
  { name: 'בית עמק',              lat: 32.9500, lng: 35.2167 },
  { name: 'גבת',                  lat: 32.6500, lng: 35.2000 },
  { name: 'גבעת ברנר',            lat: 31.8500, lng: 34.7833 },
  { name: 'גבעת חיים',            lat: 32.4000, lng: 34.9333 },
  { name: 'גינוסר',               lat: 32.8667, lng: 35.5167 },
  { name: 'גן שמואל',             lat: 32.4556, lng: 34.9667 },
  { name: 'דגניה א׳',             lat: 32.7083, lng: 35.5667 },
  { name: 'דגניה ב׳',             lat: 32.7000, lng: 35.5667 },
  { name: 'דן',                   lat: 33.2500, lng: 35.6500 },
  { name: 'דפנה',                 lat: 33.2333, lng: 35.6333 },
  { name: 'חולדה',                lat: 31.8333, lng: 34.9000 },
  { name: 'חפצי-בה',              lat: 32.5333, lng: 35.3667 },
  { name: 'יגור',                 lat: 32.7500, lng: 35.1000 },
  { name: 'יפעת',                 lat: 32.6833, lng: 35.2333 },
  { name: 'כברי',                 lat: 33.0167, lng: 35.1167 },
  { name: 'כפר גלעדי',            lat: 33.2333, lng: 35.5667 },
  { name: 'כפר מנחם',             lat: 31.7000, lng: 34.8500 },
  { name: 'כפר עזה',              lat: 31.4833, lng: 34.5500 },
  { name: 'כפר רופין',            lat: 32.5167, lng: 35.5500 },
  { name: 'כנרת',                 lat: 32.7167, lng: 35.5667 },
  { name: 'להב',                  lat: 31.3667, lng: 34.8667 },
  { name: 'לביא',                 lat: 32.7833, lng: 35.4667 },
  { name: 'מגידו',                lat: 32.5833, lng: 35.1833 },
  { name: 'מזרע',                 lat: 32.6167, lng: 35.3167 },
  { name: 'מעגן מיכאל',           lat: 32.5594, lng: 34.9219 },
  { name: 'מרחביה',               lat: 32.6000, lng: 35.2500 },
  { name: 'משמר העמק',            lat: 32.6167, lng: 35.1667 },
  { name: 'משמר השרון',           lat: 32.3667, lng: 34.8833 },
  { name: 'נגבה',                 lat: 31.6833, lng: 34.6833 },
  { name: 'נהלל',                 lat: 32.6833, lng: 35.2000 },
  { name: 'ניר דוד',              lat: 32.5167, lng: 35.4333 },
  { name: 'ניר עם',               lat: 31.4167, lng: 34.4167 },
  { name: 'נען',                  lat: 31.8667, lng: 34.8667 },
  { name: 'עין גב',               lat: 32.7833, lng: 35.6333 },
  { name: 'עין גדי',              lat: 31.4667, lng: 35.3833 },
  { name: 'עין דור',              lat: 32.6500, lng: 35.4000 },
  { name: 'עין החורש',            lat: 32.3833, lng: 34.9167 },
  { name: 'עין חרוד',             lat: 32.5583, lng: 35.3917 },
  { name: 'עין השופט',            lat: 32.5500, lng: 35.1500 },
  { name: 'עין זיוון',            lat: 33.1667, lng: 35.7833 },
  { name: 'עין כרמל',             lat: 32.6833, lng: 34.9667 },
  { name: 'עין שמר',              lat: 32.4500, lng: 35.0000 },
  { name: 'פלמחים',               lat: 31.9167, lng: 34.7000 },
  { name: 'רבדים',                lat: 31.6000, lng: 34.8333 },
  { name: 'רמת דוד',              lat: 32.6833, lng: 35.1833 },
  { name: 'רמת יוחנן',            lat: 32.7833, lng: 35.1167 },
  { name: 'שדה אילן',             lat: 32.7500, lng: 35.4833 },
  { name: 'שדות ים',              lat: 32.5000, lng: 34.8833 },
  { name: 'שפיים',                lat: 32.1833, lng: 34.8167 },
  { name: 'תל יוסף',              lat: 32.5500, lng: 35.4167 },
  { name: 'תל קציר',              lat: 32.7167, lng: 35.6000 },

  // מושבים
  { name: 'אביחיל',               lat: 32.3500, lng: 34.8833 },
  { name: 'אביעזר',               lat: 31.7167, lng: 34.9500 },
  { name: 'אבן ספיר',             lat: 31.7500, lng: 35.1000 },
  { name: 'אורה',                 lat: 31.7667, lng: 35.1167 },
  { name: 'אחיטוב',               lat: 32.4167, lng: 35.0000 },
  { name: 'אחיסמך',               lat: 31.9500, lng: 34.8833 },
  { name: 'אל-רום',               lat: 33.1000, lng: 35.7667 },
  { name: 'אליכין',               lat: 32.3833, lng: 34.9167 },
  { name: 'אמונים',               lat: 31.7833, lng: 34.7333 },
  { name: 'באר טוביה',            lat: 31.7667, lng: 34.7333 },
  { name: 'ביתן אהרון',           lat: 32.3333, lng: 34.8667 },
  { name: 'בית גמליאל',           lat: 31.8500, lng: 34.7500 },
  { name: 'בית חנניה',            lat: 32.5500, lng: 34.9167 },
  { name: 'בית חלקיה',            lat: 31.8167, lng: 34.8000 },
  { name: 'בית יצחק-שער חפר',     lat: 32.3167, lng: 34.9000 },
  { name: 'בית עובד',             lat: 31.9500, lng: 34.7667 },
  { name: 'בני דרום',             lat: 31.7833, lng: 34.7167 },
  { name: 'בני עטרות',            lat: 32.1000, lng: 34.9333 },
  { name: 'גאולי תימן',           lat: 32.3833, lng: 34.9333 },
  { name: 'גאולים',               lat: 32.3333, lng: 34.8833 },
  { name: 'גבעת עדה',             lat: 32.5167, lng: 34.9833 },
  { name: 'גבעת שפירא',           lat: 32.3667, lng: 34.8667 },
  { name: 'גן הדרום',             lat: 31.7833, lng: 34.6833 },
  { name: 'גן שלמה',              lat: 31.8333, lng: 34.8000 },
  { name: 'גנות',                 lat: 31.9333, lng: 34.8167 },
  { name: 'דקל',                  lat: 31.2333, lng: 34.3833 },
  { name: 'הדר עם',               lat: 32.3500, lng: 34.9000 },
  { name: 'המעפיל',               lat: 32.4000, lng: 34.9500 },
  { name: 'זיתן',                 lat: 32.0167, lng: 34.9000 },
  { name: 'חגלה',                 lat: 32.3333, lng: 34.9167 },
  { name: 'חיבת ציון',            lat: 32.3667, lng: 34.8833 },
  { name: 'חרוצים',               lat: 32.3167, lng: 34.9000 },
  { name: 'טירת יהודה',           lat: 32.0167, lng: 34.9167 },
  { name: 'יד חנה',               lat: 32.3333, lng: 34.9167 },
  { name: 'יחיעם',                lat: 33.0167, lng: 35.2000 },
  { name: 'ינוב',                 lat: 32.3667, lng: 35.0000 },
  { name: 'כדורי',                lat: 32.7167, lng: 35.4167 },
  { name: 'כפר ביאליק',           lat: 32.8500, lng: 35.1000 },
  { name: 'כפר ויתקין',           lat: 32.3667, lng: 34.8833 },
  { name: 'כפר חב״ד',             lat: 31.9833, lng: 34.8667 },
  { name: 'כפר הס',               lat: 32.2167, lng: 34.9167 },
  { name: 'כפר הרא"ה',            lat: 32.4333, lng: 34.9833 },
  { name: 'כפר טרומן',            lat: 31.9833, lng: 34.9333 },
  { name: 'כפר יונה',             lat: 32.3167, lng: 34.9333 },
  { name: 'כפר יחזקאל',           lat: 32.5833, lng: 35.3500 },
  { name: 'כפר נטר',              lat: 32.2667, lng: 34.9167 },
  { name: 'כפר עבודה',            lat: 32.3167, lng: 34.9167 },
  { name: 'כפר פינס',             lat: 32.4833, lng: 35.0000 },
  { name: 'כפר קיש',              lat: 32.7167, lng: 35.4333 },
  { name: 'כפר ראש הנקרה',        lat: 33.0833, lng: 35.1000 },
  { name: 'כפר שמריהו',           lat: 32.1961, lng: 34.8394 },
  { name: 'מגשימים',              lat: 32.1000, lng: 34.9167 },
  { name: 'מנחמיה',               lat: 32.6667, lng: 35.5500 },
  { name: 'מסדה',                 lat: 32.7833, lng: 35.6167 },
  { name: 'מעגן',                 lat: 32.7333, lng: 35.5833 },
  { name: 'מצליח',                lat: 31.9500, lng: 34.9000 },
  { name: 'משמרות',               lat: 32.4897, lng: 34.9236 },
  { name: 'משמר איילון',          lat: 31.8333, lng: 34.9667 },
  { name: 'משמר דוד',             lat: 31.8167, lng: 34.8833 },
  { name: 'ניר אליהו',            lat: 32.2000, lng: 34.9333 },
  { name: 'ניר גלים',             lat: 31.8833, lng: 34.7167 },
  { name: 'ניר עציון',            lat: 32.7000, lng: 34.9667 },
  { name: 'נירים',                lat: 31.3667, lng: 34.3833 },
  { name: 'נעורים',               lat: 32.3500, lng: 34.9167 },
  { name: 'נצר חזני',             lat: 31.8500, lng: 34.7833 },
  { name: 'נצר סרני',             lat: 31.8667, lng: 34.8167 },
  { name: 'עין ורד',              lat: 32.2667, lng: 34.9167 },
  { name: 'עמיקם',                lat: 32.5333, lng: 35.0333 },
  { name: 'פרדסיה',               lat: 32.3000, lng: 34.9000 },
  { name: 'צור יגאל',             lat: 32.2000, lng: 34.9167 },
  { name: 'צור משה',              lat: 32.3333, lng: 34.8833 },
  { name: 'קדימה',                lat: 32.2747, lng: 34.9197 },
  { name: 'קדמה',                 lat: 31.7000, lng: 34.8333 },
  { name: 'שדה דוד',              lat: 31.7167, lng: 34.7167 },
  { name: 'שדה משה',              lat: 31.7667, lng: 34.8667 },
  { name: 'שדה עוזיהו',           lat: 31.7833, lng: 34.7500 },
  { name: 'שדה ורבורג',           lat: 32.3167, lng: 34.9000 },
  { name: 'שדות מיכה',            lat: 31.7333, lng: 34.9500 },
  { name: 'שלווה',                lat: 31.8333, lng: 34.8000 },
  { name: 'תל מונד',              lat: 32.2667, lng: 34.9167 },
  { name: 'תמרת',                 lat: 32.7500, lng: 35.2167 },
];
