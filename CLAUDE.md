# HobbyMatch Israel — Project Memory & Guardrails

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (hobby images)
- **Auth/Email:** EmailJS (OTP verification + match notifications)
- **Hosting:** GitHub Pages
- **Firebase SDK:** v10 Compat mode — NO Admin SDK, NO private keys

---

## File Structure
```
hobby-match/
├── index.html          ← Landing page
├── register.html       ← Registration + OTP flow
├── profiles.html       ← Discovery feed with radius filter
├── config.js           ← Firebase config, EmailJS config, cities array
├── auth.js             ← OTP logic + session management
├── firebase-logic.js   ← CRUD: profiles, likes, image uploads
├── ui-render.js        ← Profile card rendering + My Matches tab
└── CLAUDE.md           ← This file
```

---

## Firebase Config
```javascript
const firebaseConfig = {
  apiKey: "AIzaSyC38cgju5tJk8orJhDZlXLFLuNQBcET1n8",
  authDomain: "hobby-connection-adaca.firebaseapp.com",
  projectId: "hobby-connection-adaca",
  storageBucket: "hobby-connection-adaca.firebasestorage.app",
  messagingSenderId: "864875672697",
  appId: "1:864875672697:web:298b2927ad26f5c0ff90a8"
};
```

---

## Firestore Collections

### `users/{email_sanitized}`
Document ID = email with `@` → `_at_` and `.` → `_dot_`
```
{
  fullName: string,
  email: string,
  phone: string,
  age: number,
  city: string,
  hobby: string,
  hobbyDescription: string,
  romantic: boolean,
  hobbyImageUrl: string,
  latitude: number,
  longitude: number,
  createdAt: timestamp
}
```

### `likes/{senderEmail_receiverEmail}`
Document ID format: `senderEmail_receiverEmail` (use sanitized emails)
```
{
  from: string,
  to: string,
  createdAt: timestamp
}
```

---

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null
        && request.auth.token.email == userId;
    }
    match /likes/{likeId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null
        && resource.data.from == request.auth.token.email;
    }
  }
}
```
> Update rules before 2026-05-09 expiry!

---

## Auth Flow (OTP via EmailJS)
1. User enters email on `register.html`
2. `auth.js` generates 6-digit OTP, stores in `sessionStorage` with 10-min expiry
3. EmailJS sends OTP to user's email
4. User enters OTP → verified client-side
5. On success: user saved to `localStorage` as `hobbyMatchUser`
6. Every page checks session on load → redirect to `register.html` if missing

---

## Match System
- Like ID: `senderEmail_receiverEmail`
- On like: check if reverse `receiverEmail_senderEmail` exists in Firestore
- If yes → MATCH → EmailJS sends notification email to both users
- Initial contact via `mailto:` link — no phone numbers exposed at first stage

---

## Israeli Cities (config.js — 30+ cities)
```javascript
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
```

---

## Skills & Guardrails for Claude Code

### Firebase Client-Side Architect
- SDK v10 Compat via CDN only
- NEVER use Admin SDK or service account keys in frontend
- NEVER commit `.env` or private keys to GitHub
- **SDK Consistency** — Use the Firebase v10 Compat (Namespaced) syntax throughout the project to ensure compatibility with simple script tags and maintain consistency across all modular JS files.
- **CDN Script Loading** — Since we are using Firebase v10 Compat Mode, ensure all HTML files include the necessary scripts for Firebase App, Firestore, Storage, and Auth via CDN in the `<head>` section before any custom JS files are loaded.
- **Image Handling Workflow** — Always upload hobby images to Firebase Storage first. Once the upload is successful, retrieve the Download URL and save only that URL string to the Firestore user document. Do NOT store images as Base64 strings in Firestore.

### Smart Redirect Logic
- `profiles.html` must redirect to `index.html` if no active session is detected in `localStorage`.
- `index.html` and `register.html` should automatically redirect to `profiles.html` if an active session is already found, to prevent logged-in users from re-registering.

### RTL & Hebrew UI Specialist
- `<html lang="he" dir="rtl">` on every page
- All user-facing text in Hebrew
- Tailwind `rtl:` variants where needed
- Inputs: `direction: rtl; text-align: right`

### Clean Code Practitioner
- `config.js` → config + static data only
- `auth.js` → auth + session only
- `firebase-logic.js` → Firestore + Storage only
- `ui-render.js` → DOM + card rendering only
- HTML files → structure only, import JS modules

### User-Facing Error Handling
Every asynchronous operation (Firebase calls, EmailJS, Image Uploads) must include a `try-catch` block. Errors should be communicated to the user via simple Hebrew UI messages (e.g., `'קוד שגוי, נסה שוב'`) instead of just logging to the console.

---

## Self-Correction Protocol
1. **Plan first** — technical plan before any file modification
2. **Security check** — updated Firestore rules after each stage
3. **Data integrity** — likes ID always `senderEmail_receiverEmail`
4. **No secrets** — never hardcode API keys beyond `config.js`
5. **Validation** — Perform a quick internal validation for edge cases before providing the final code.
6. **Self-Validation Skill** — Before completing a task, use the terminal to run the code (if applicable) or perform a rigorous logic walkthrough to detect 'silent bugs' (like incorrect Firebase paths or RTL alignment issues).

---

## EmailJS Configuration

**Credentials (place in `config.js`):**
```javascript
const EMAILJS_CONFIG = {
  serviceId:       'service_9p6dx8n',
  otpTemplateId:   'template_ajwgbh9',
  publicKey:       'WJ8SooBxHjs4CX0Vo'
};
```

**OTP Template Variables:**
- `{{otp_code}}` — the 6-digit code
- `{{email}}` — recipient email address

**SDK Loading:**
Load EmailJS via CDN in `<head>` before any custom JS:
```html
<script src="https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js"></script>
<script>emailjs.init('WJ8SooBxHjs4CX0Vo');</script>
```

---

**Jamstack Architecture** — The project follows a Jamstack architecture (JavaScript, APIs, and Markup). All dynamic data interactions are handled via Firebase client-side SDK, allowing the frontend to be hosted on any static hosting provider (GitHub Pages, Vercel, Netlify).

**Static Web App (Server-Agnostic)** — The project is designed as a Static Web App where all dynamic logic is handled client-side via the Firebase SDK. The codebase must remain compatible with any static hosting provider (GitHub Pages, Vercel, Netlify) or traditional cPanel hosting. Avoid any environment-specific hardcoding to ensure the site can be deployed seamlessly to any standard web server.

---
- [ ] Stage 1: Firebase Auth + OTP via EmailJS
- [ ] Stage 2: Profile creation + image upload + city distance
- [ ] Stage 3: Discovery feed + real-time radius filter
- [ ] Stage 4: Reciprocal matching + My Matches tab + email notifications

---

## GitHub
- Repo: https://github.com/zivv1992-coder/hobby-match
- Live: https://zivv1992-coder.github.io/hobby-match/

---

## Start Session
```bash
cd /path/to/hobby-match
claude
```
