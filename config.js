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
const FCM_VAPID_KEY = "p2vorxaidfcNY3v6cC_yrM_TbSrGecdn08ndERwF1yY";

// ─── Admin ──────────────────────────────────────────────────────────────────
// Replace with the email address of the admin user
const ADMIN_EMAIL = 'zivv1992@gmail.com';

// ─── Dev Mode ───────────────────────────────────────────────────────────────
// Set to false before deploying to production
const IS_DEV_MODE = true;

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
  { label: '➕ אחר',           tags: ['אחר'] }
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

// ─── Israeli Cities ─────────────────────────────────────────────────────────
const CITIES = [
  // גוש דן
  { name: 'תל אביב',          lat: 32.0853, lng: 34.7818 },
  { name: 'רמת גן',           lat: 32.0833, lng: 34.8167 },
  { name: 'בני ברק',          lat: 32.0833, lng: 34.8333 },
  { name: 'גבעתיים',          lat: 32.0706, lng: 34.8102 },
  { name: 'חולון',            lat: 32.0167, lng: 34.7667 },
  { name: 'בת ים',            lat: 32.0236, lng: 34.7497 },
  { name: 'אור יהודה',        lat: 32.0269, lng: 34.8597 },
  { name: 'גבעת שמואל',       lat: 32.0792, lng: 34.8500 },
  { name: 'קרית אונו',        lat: 32.0597, lng: 34.8622 },
  { name: 'יהוד',             lat: 32.0317, lng: 34.8883 },
  // שרון
  { name: 'פתח תקווה',        lat: 32.0840, lng: 34.8878 },
  { name: 'רמת השרון',        lat: 32.1469, lng: 34.8397 },
  { name: 'הרצליה',           lat: 32.1663, lng: 34.8436 },
  { name: 'כפר שמריהו',       lat: 32.1961, lng: 34.8394 },
  { name: 'הוד השרון',        lat: 32.1522, lng: 34.8920 },
  { name: 'רעננה',            lat: 32.1839, lng: 34.8706 },
  { name: 'כפר סבא',          lat: 32.1789, lng: 34.9076 },
  { name: 'קדימה-צורן',       lat: 32.2747, lng: 34.9197 },
  { name: 'אבן יהודה',        lat: 32.2644, lng: 34.8903 },
  { name: 'ראש העין',         lat: 32.0958, lng: 34.9572 },
  { name: 'אלעד',             lat: 32.0533, lng: 34.9500 },
  { name: 'נתניה',            lat: 32.3215, lng: 34.8532 },
  { name: 'חדרה',             lat: 32.4344, lng: 34.9197 },
  { name: 'פרדס חנה-כרכור',   lat: 32.4742, lng: 34.9612 },
  { name: 'קיסריה',           lat: 32.5014, lng: 34.9000 },
  { name: 'זכרון יעקב',       lat: 32.5711, lng: 34.9497 },
  // מרכז - שפלה
  { name: 'ראשון לציון',      lat: 31.9730, lng: 34.7925 },
  { name: 'נס ציונה',         lat: 31.9303, lng: 34.7969 },
  { name: 'רחובות',           lat: 31.8928, lng: 34.8113 },
  { name: 'לוד',              lat: 31.9528, lng: 34.8954 },
  { name: 'רמלה',             lat: 31.9296, lng: 34.8675 },
  { name: 'שוהם',             lat: 31.9936, lng: 34.9402 },
  { name: 'גני תקווה',        lat: 32.0608, lng: 34.8742 },
  { name: 'מודיעין-מכבים-רעות', lat: 31.8969, lng: 35.0095 },
  { name: 'יבנה',             lat: 31.8761, lng: 34.7392 },
  { name: 'גן יבנה',          lat: 31.7892, lng: 34.7064 },
  { name: 'גדרה',             lat: 31.8119, lng: 34.7783 },
  { name: 'מזכרת בתיה',       lat: 31.8597, lng: 34.7753 },
  { name: 'קריית עקרון',      lat: 31.8636, lng: 34.8303 },
  // ירושלים ויהודה
  { name: 'ירושלים',          lat: 31.7683, lng: 35.2137 },
  { name: 'מעלה אדומים',      lat: 31.7731, lng: 35.2986 },
  { name: 'בית שמש',          lat: 31.7519, lng: 34.9831 },
  { name: 'מבשרת ציון',       lat: 31.8058, lng: 35.1461 },
  { name: 'ביתר עילית',       lat: 31.6972, lng: 35.1161 },
  { name: 'אבו גוש',          lat: 31.8094, lng: 35.1072 },
  { name: 'אפרת',             lat: 31.6586, lng: 35.1556 },
  // דרום - אשדוד / אשקלון
  { name: 'אשדוד',            lat: 31.8014, lng: 34.6436 },
  { name: 'אשקלון',           lat: 31.6688, lng: 34.5743 },
  { name: 'קריית גת',         lat: 31.6100, lng: 34.7640 },
  { name: 'קריית מלאכי',      lat: 31.7328, lng: 34.7358 },
  // נגב
  { name: 'באר שבע',          lat: 31.2518, lng: 34.7915 },
  { name: 'דימונה',           lat: 31.0691, lng: 35.0317 },
  { name: 'ערד',              lat: 31.2583, lng: 35.2122 },
  { name: 'אופקים',           lat: 31.3125, lng: 34.6183 },
  { name: 'נתיבות',           lat: 31.4208, lng: 34.5883 },
  { name: 'שדרות',            lat: 31.5247, lng: 34.5983 },
  { name: 'רהט',              lat: 31.3931, lng: 34.7542 },
  { name: 'ירוחם',            lat: 30.9869, lng: 34.9283 },
  { name: 'מצפה רמון',        lat: 30.6100, lng: 34.8011 },
  { name: 'תל שבע',           lat: 31.2578, lng: 34.8261 },
  { name: 'כסיפה',            lat: 31.3214, lng: 34.8764 },
  { name: 'אילת',             lat: 29.5581, lng: 34.9482 },
  // חיפה וקריות
  { name: 'חיפה',             lat: 32.7940, lng: 34.9896 },
  { name: 'קריית ים',         lat: 32.8500, lng: 35.0667 },
  { name: 'קריית ביאליק',     lat: 32.8333, lng: 35.0833 },
  { name: 'קריית אתא',        lat: 32.8167, lng: 35.1000 },
  { name: 'קריית מוצקין',     lat: 32.8458, lng: 35.0736 },
  { name: 'נשר',              lat: 32.7667, lng: 35.0333 },
  { name: 'טירת כרמל',        lat: 32.7667, lng: 34.9667 },
  { name: 'עתלית',            lat: 32.6933, lng: 34.9417 },
  { name: 'דאלית אל-כרמל',    lat: 32.6927, lng: 35.0472 },
  { name: 'קריית טבעון',      lat: 32.7167, lng: 35.1167 },
  // גליל מערבי
  { name: 'עכו',              lat: 32.9228, lng: 35.0780 },
  { name: 'נהריה',            lat: 33.0050, lng: 35.0980 },
  { name: 'שלומי',            lat: 33.0694, lng: 35.1472 },
  { name: 'כרמיאל',           lat: 32.9167, lng: 35.3000 },
  { name: 'מעלות-תרשיחא',     lat: 33.0167, lng: 35.2833 },
  { name: 'שפרעם',            lat: 32.8083, lng: 35.1667 },
  { name: 'טמרה',             lat: 32.8594, lng: 35.1944 },
  { name: 'סחנין',            lat: 32.8653, lng: 35.2906 },
  { name: 'מגאר',             lat: 32.8897, lng: 35.4017 },
  { name: 'ג\'דיידה-מכר',     lat: 32.9278, lng: 35.1536 },
  { name: 'דיר אל-אסד',      lat: 32.9397, lng: 35.2653 },
  { name: 'כאבול',            lat: 32.8622, lng: 35.2236 },
  { name: 'יוקנעם עילית',     lat: 32.6619, lng: 35.1044 },
  // גליל מזרחי וצפון
  { name: 'צפת',              lat: 32.9645, lng: 35.4955 },
  { name: 'חצור הגלילית',     lat: 33.0183, lng: 35.5500 },
  { name: 'ראש פינה',         lat: 32.9717, lng: 35.5472 },
  { name: 'קריית שמונה',      lat: 33.2083, lng: 35.5694 },
  { name: 'מטולה',            lat: 33.2689, lng: 35.5719 },
  { name: 'קצרין',            lat: 32.9936, lng: 35.6917 },
  // עמקים וגליל תחתון
  { name: 'טבריה',            lat: 32.7940, lng: 35.5308 },
  { name: 'נצרת',             lat: 32.6996, lng: 35.3035 },
  { name: 'נוף הגליל',        lat: 32.7005, lng: 35.3339 },
  { name: 'ריינה',            lat: 32.7072, lng: 35.3106 },
  { name: 'יפיע',             lat: 32.6783, lng: 35.2822 },
  { name: 'עפולה',            lat: 32.6074, lng: 35.2898 },
  { name: 'רמת ישי',          lat: 32.7044, lng: 35.1675 },
  { name: 'בית שאן',          lat: 32.5000, lng: 35.5000 },
  { name: 'מגדל העמק',        lat: 32.6750, lng: 35.2383 },
  { name: 'אום אל-פחם',       lat: 32.5167, lng: 35.1500 },
  { name: 'באקה אל-גרביה',    lat: 32.4208, lng: 35.0358 },
  { name: 'אור עקיבא',        lat: 32.5089, lng: 34.9172 },
  { name: 'משהד',             lat: 32.7431, lng: 35.3347 },
  // מרכז - ערים ערביות
  { name: 'טייבה',            lat: 32.2683, lng: 34.9964 },
  { name: 'טירה',             lat: 32.2319, lng: 34.9514 },
  { name: 'קלנסווה',          lat: 32.2836, lng: 34.9803 },
  { name: 'כפר קאסם',         lat: 32.1136, lng: 34.9750 },
  { name: 'ג\'לג\'וליה',       lat: 32.1567, lng: 34.9578 },
  { name: 'ג\'ת',              lat: 32.4033, lng: 35.0797 },
  { name: 'ג\'סר א-זרקא',      lat: 32.5319, lng: 34.9106 },
  { name: 'ערערה',            lat: 32.4997, lng: 35.0531 },
  // גולן
  { name: 'מג\'דל שמס',        lat: 33.2694, lng: 35.7681 },
];
