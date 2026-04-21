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

// ─── Israeli Cities ─────────────────────────────────────────────────────────
const CITIES = [
  { name: 'תל אביב',      lat: 32.0853, lng: 34.7818 },
  { name: 'ירושלים',      lat: 31.7683, lng: 35.2137 },
  { name: 'חיפה',         lat: 32.7940, lng: 34.9896 },
  { name: 'ראשון לציון',  lat: 31.9730, lng: 34.7925 },
  { name: 'פתח תקווה',    lat: 32.0840, lng: 34.8878 },
  { name: 'אשדוד',        lat: 31.8014, lng: 34.6436 },
  { name: 'נתניה',        lat: 32.3215, lng: 34.8532 },
  { name: 'באר שבע',      lat: 31.2518, lng: 34.7915 },
  { name: 'בני ברק',      lat: 32.0833, lng: 34.8333 },
  { name: 'רמת גן',       lat: 32.0833, lng: 34.8167 },
  { name: 'חולון',        lat: 32.0167, lng: 34.7667 },
  { name: 'הרצליה',       lat: 32.1663, lng: 34.8436 },
  { name: 'רחובות',       lat: 31.8928, lng: 34.8113 },
  { name: 'כפר סבא',      lat: 32.1789, lng: 34.9076 },
  { name: 'מודיעין',      lat: 31.8969, lng: 35.0095 },
  { name: 'פרדס חנה',     lat: 32.4742, lng: 34.9612 },
  { name: 'חדרה',         lat: 32.4344, lng: 34.9197 },
  { name: 'נהריה',        lat: 33.0050, lng: 35.0980 },
  { name: 'עכו',          lat: 32.9228, lng: 35.0780 },
  { name: 'טבריה',        lat: 32.7940, lng: 35.5308 },
  { name: 'צפת',          lat: 32.9645, lng: 35.4955 },
  { name: 'אשקלון',       lat: 31.6688, lng: 34.5743 },
  { name: 'אילת',         lat: 29.5581, lng: 34.9482 },
  { name: 'לוד',          lat: 31.9528, lng: 34.8954 },
  { name: 'רמלה',         lat: 31.9296, lng: 34.8675 },
  { name: 'עפולה',        lat: 32.6074, lng: 35.2898 },
  { name: 'נצרת',         lat: 32.6996, lng: 35.3035 },
  { name: 'דימונה',       lat: 31.0691, lng: 35.0317 },
  { name: 'קריית גת',     lat: 31.6100, lng: 34.7640 },
  { name: 'מעלה אדומים',  lat: 31.7731, lng: 35.2986 },
];
