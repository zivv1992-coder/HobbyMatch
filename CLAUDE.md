# HobbyMatch Israel — Project Memory & Guardrails

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (hobby images)
- **Auth/Email:** EmailJS (OTP verification + match notifications)
- **Hosting:** GitHub Pages
- **Firebase SDK:** v10 Compat mode via CDN — NO Admin SDK, NO private keys

---

## File Structure
```
hobby-match/
├── index.html              ← Landing page
├── register.html           ← Registration + OTP flow
├── profiles.html           ← Main app shell (discover, matches, events, chat)
├── config.js               ← Firebase config, EmailJS config, IS_DEV_MODE, cities array
├── auth.js                 ← OTP logic + session management
├── firebase-logic.js       ← CRUD: profiles, likes, image uploads
├── ui-render.js            ← Profile card rendering + My Matches tab
└── js/
    ├── profiles-boot.js         ← App init, session check, tab routing
    ├── profiles-state.js        ← Shared state (me, allProfiles, allEventsData…)
    ├── profiles-utils.js        ← Helpers: sanitizeEmail, formatWhatsApp, distance…
    ├── profiles-ui.js           ← Discover feed, filters, profile cards
    ├── profiles-matches.js      ← My Matches tab, like/unmatch logic
    ├── profiles-events.js       ← Events tab: render, modal, join/leave, WhatsApp
    ├── profiles-chat.js         ← Real-time chat between matched users
    ├── profiles-notifications.js← FCM push notifications, bell badge, panel
    └── profiles-edit-profile.js ← Edit profile drawer, gallery, romantic toggle
```

---

## Firestore Collections

### `users/{email_sanitized}`
Document ID = email with `@` → `_at_` and `.` → `_dot_`
```
{ fullName, email, phone, age, city, hobby, hobbyDescription,
  romantic, hobbyImageUrl, latitude, longitude, createdAt }
```

### `likes/{senderEmail_receiverEmail}`
```
{ from, to, createdAt }
```

### `events/{eventId}`
```
{ title, description, dateTime, location, hobbies: string[],
  organizerName, organizerPhone, organizerType: 'self'|'other',
  actionLinks: string[], attendees: string[], createdBy, createdAt }
```

### `chats/{chatId}/messages/{messageId}`
Chat ID = sorted emails joined with `_`
```
{ sender, text, createdAt }
```

---

## Firestore Security Rules
> ⚠️ Update rules before **2026-05-09** expiry!
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.token.email == userId;
    }
    match /likes/{likeId} {
      allow read: if true;
      allow create: if request.auth != null;
      allow delete: if request.auth != null && resource.data.from == request.auth.token.email;
    }
  }
}
```

---

## Auth Flow (OTP via EmailJS)
1. User enters email → `auth.js` generates 6-digit OTP, stores in `sessionStorage` (10-min expiry)
2. EmailJS sends OTP to user's email (`IS_DEV_MODE = false` in production)
3. User enters OTP → verified client-side → session saved to `localStorage` as `hobbyMatchUser`
4. Every page checks session on load → redirect to `register.html` if missing
5. `index.html` / `register.html` redirect to `profiles.html` if session exists

---

## Match System
- Like ID: `senderEmail_receiverEmail` (sanitized)
- On like: check if reverse like exists → MATCH → EmailJS notification to both users

---

## EmailJS Config (in `config.js`)
```javascript
const EMAILJS_CONFIG = {
  serviceId:     'service_9p6dx8n',
  otpTemplateId: 'template_ajwgbh9',
  publicKey:     'WJ8SooBxHjs4CX0Vo'
};
const IS_DEV_MODE = false;   // true = show OTP in alert (dev), false = send via EmailJS
const FCM_VAPID_KEY = "p2vorxaidfcNY3v6cC_yrM_TbSrGecdn08ndERwF1yY"; // Push notifications
```
Template variables: `{{otp_code}}`, `{{email}}`

---

## Guardrails

- Firebase v10 Compat (Namespaced) syntax only — no modular imports
- All HTML files load Firebase + EmailJS via CDN in `<head>` before custom JS
- Images → upload to Storage first, save Download URL to Firestore (no Base64)
- `<html lang="he" dir="rtl">` on every page, all UI text in Hebrew
- Every async op (Firebase, EmailJS, uploads) must have `try-catch` with Hebrew error message
- `config.js` = config/data only · `auth.js` = auth/session only · `firebase-logic.js` = Firestore/Storage only
- Static Web App — no server-side code, compatible with GitHub Pages / Netlify / cPanel

---

## GitHub
- Repo: https://github.com/zivv1992-coder/hobby-match
- Live: https://zivv1992-coder.github.io/hobby-match/
