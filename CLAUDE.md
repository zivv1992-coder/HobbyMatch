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
├── index.html              ← Landing page ("הרשמה" → tahbiva.html)
├── tahbiva.html            ← Sign-up starts here: Tahbiva 🦉 onboarding (before auth) → draft in localStorage
├── register.html           ← Login + sign-up auth (Google / OTP) → step4 saves the Tahbiva draft
├── profiles.html           ← Main app shell — tabs: פעילויות (home) · מי באזור · קונקשנז'; chat
├── config.js               ← Firebase/EmailJS config, IS_DEV_MODE, CITIES, HOBBY_CATEGORIES, HOBBY_EMOJI, TAHBIVA
├── auth.js                 ← OTP logic + session management
├── firebase-logic.js       ← CRUD: profiles, likes, image uploads
├── ui-render.js            ← Profile card rendering + My Matches tab
└── js/
    ├── tahbiva.js               ← Tahbiva flow: this-or-that → categories → hobby tiles → city → nearby → … → ready
    ├── profiles-boot.js         ← App init, session check, tab routing (members open on פעילויות, guests on מי באזור)
    ├── profiles-state.js        ← Shared state (me, allProfiles, allEventsData…)
    ├── profiles-utils.js        ← Helpers: sanitizeEmail, formatWhatsApp, distance…
    ├── profiles-ui.js           ← Discover feed, filters, profile cards
    ├── profiles-matches.js      ← My Matches tab, like/unmatch logic
    ├── profiles-events.js       ← פעילויות tab: "מה קורה סביבי", "מי לפגוש" strip, 50 km filter, create (with city), join/leave
    ├── profiles-chat.js         ← Real-time chat between matched users
    ├── profiles-requests.js     ← "💬 שלח הודעה" to non-matches + "בקשות" in קונקשנז' (accept → match + chat)
    ├── profiles-notifications.js← FCM push notifications, bell badge, panel
    ├── profiles-edit-profile.js ← Edit profile drawer in cards: photos, about + looking-for, hobbies, details
    ├── analytics.js             ← Anonymous sign-up funnel tracking (trackEvent) → admin "משפך הרשמה"
    ├── city-picker.js           ← Searchable city field (type a letter → matching cities, א-ב order)
    └── hobby-picker.js          ← Category bubbles → sub-hobby pills + custom hobbies (register + edit), HOBBY_CATEGORIES in config.js
```

---

## Firestore Collections

### `users/{email_sanitized}`
Document ID = email with `@` → `_at_` and `.` → `_dot_`
```
{ fullName, email, phone, age, city, hobby, hobbies: string[], hobbyDescription,
  lookingFor: ('friends'|'partners'|'romantic')[], romantic,
  profilePhotoURL, hobbyImages: string[], hobbyImageUrl, latitude, longitude, createdAt }
```
`lookingFor` = what the user is looking for (Tahbiva + edit drawer). `romantic` = `lookingFor` includes `'romantic'`,
kept for the ❤️ badge and the discover filter (older profiles have only `romantic`).
`profilePhotoURL` is shown only to matches; `hobbyImages` are public (`hobbyImageUrl` = first of them).
`hobbies` = source of truth (array). `hobby` = same list joined with `', '`, kept for existing consumers
(cards, filters, events, admin). Read with `getUserHobbies(user)` — falls back to splitting legacy `hobby`.

### `likes/{senderEmail_receiverEmail}`
```
{ from, to, createdAt }
```

### `events/{eventId}`
```
{ title, description, dateTime, location, city, latitude, longitude,
  associatedHobbies: string[], hobby, createdBy, creatorName, creatorPhone,
  organizerName, organizerPhone, actionLinks: string[], detectedHobbyTag,
  interested: { email, name, display }[], atmosphereTags, eventActivityTags, createdAt }
```

Shown in the UI as **פעילות/פעילויות** (the collection keeps its name). `city`/lat/lng exist on activities
created from 2026-10-26; older ones have none and are always shown. The list shows activities within 50 km.

### `message_requests/{fromEmail_toEmail}`  (sanitized emails)
```
{ from, to, text, status: 'pending'|'accepted'|'declined', createdAt }
```
"💬 שלח הודעה" to someone you're not matched with. Accept = likes both ways (the normal match)
+ `text` becomes the first chat message. Decline is silent. Both sides writing = instant match.

### `analytics_events/{autoId}`
Written by `js/analytics.js`, read only by admin. No PII.
```
{ event, visitorId, source, path, device: 'mobile'|'desktop', createdAt }
```
Events: `landing_view`, `register_view`, `signup_start`, `profile_form`, `profile_created`,
`guest_browse`, `login_start`, `login`, `tahbiva_start`, `tahbiva_done`. Skipped on `file:` / localhost.

### `chats/{chatId}/messages/{messageId}`
Chat ID = sorted **sanitized** emails joined with `__` (`_getChatId` in profiles-chat.js)
```
{ from, text, sentAt }
```

---

## Firestore Security Rules
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if true;
    }
    match /likes/{likeId} {
      allow read, write: if true;
    }
    match /chats/{chatId}/messages/{messageId} {
      allow read, write: if true;
    }
    match /events/{eventId} {
      allow read, write: if true;
    }
    match /message_requests/{docId} {
      allow read, write: if true;
    }
    match /feedback/{docId} {
      allow read, write: if true;
    }
    match /reports/{docId} {
      allow read: if request.auth != null && request.auth.token.email == 'zivv1992@gmail.com';
      allow write: if true;
    }
    match /event_reviews/{docId} {
      allow create: if true;
      allow read: if request.auth != null && request.auth.token.email == 'zivv1992@gmail.com';
    }
    match /analytics_events/{docId} {
      allow create: if true;
      allow read: if request.auth != null && request.auth.token.email == 'zivv1992@gmail.com';
    }
    match /admin_verify/{docId} {
      allow read, write: if request.auth != null && request.auth.token.email == 'zivv1992@gmail.com';
    }
  }
}
```

---

Rules live only in the Firebase console (no rules file in the repo) — change them there.

---

## Privacy Policy
- `privacy.html` — דף פרטיות מלא לפי חוק הגנת הפרטיות הישראלי, נגיש מכל דף
- בדף ההרשמה (`register.html`) מופיעה הודעה שמספר הטלפון נשמר אך **לא מוצג** למשתמשים אחרים — מופיע רק למי שיש מאץ' משותף

---

## Admin Auth
- `admin.html` מוגן עם Firebase Auth (Email/Password)
- רק המייל שמוגדר כ-`ADMIN_EMAIL` ב-admin.html יכול להתחבר
- Dashboard נטען רק אחרי אימות מוצלח (`onAuthStateChanged`)

---

## Sign-up Flow (Tahbiva first)
1. `index.html` "הרשמה" (and the guest sign-up wall) → `tahbiva.html`. No auth yet.
2. Tahbiva builds a draft in `localStorage[TAHBIVA_DRAFT_KEY]`: hobbies (💚 only — no "want to try"), categories,
   city, lookingFor, bio, age, phone. "This or that" answers pre-mark hobbies. "לידך" shows real nearby users
   with shared hobbies (`displayName` only, no photo).
3. "שמרו לי את הפרופיל" → `register.html?mode=register&from=tahbiva` → Google or email OTP (below).
4. New user + finished draft → **step4**: name, one photo gallery (first = profile photo, rest = hobbyImages,
   "אעלה תמונות אחר כך"), privacy consent → `saveProfileToFirestore` → draft cleared → `profiles.html?new=1`.
5. `register.html` without a draft and not `mode=login` → redirected to `tahbiva.html`. The old long form (step3)
   remains only as a fallback (e.g. a new email entered in login mode).

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
const FCM_VAPID_KEY = "BJ9FYrOsn301Wfq9tA6em9wfQO8sQH3Ku13ksh7Blc9s45WLNbPRZo68Ip3bKTECpzGqQ0UoTjDlvdgEGLixk2I"; // Push notifications
```
Template variables: `{{otp_code}}`, `{{email}}`

---

## Guardrails

- Firebase v10 Compat (Namespaced) syntax only — no modular imports
- All HTML files load Firebase + EmailJS via CDN in `<head>` before custom JS
- Images → upload to Storage first, save Download URL to Firestore (no Base64)
- `<html lang="he" dir="rtl">` on every page, all UI text in Hebrew
- Other users' names are always shown via `displayName(fullName)` ("דן כהן" → "דן כ", in `js/profiles-utils.js`;
  copy in `functions/index.js` for push texts). Full name only for the user themself and in admin.html
- Open work items: `docs/BACKLOG.md`
- Every async op (Firebase, EmailJS, uploads) must have `try-catch` with Hebrew error message
- `config.js` = config/data only · `auth.js` = auth/session only · `firebase-logic.js` = Firestore/Storage only
- Static Web App — no server-side code, compatible with GitHub Pages / Netlify / cPanel

---

## Tests (Playwright, `tests/`)
- Firebase is mocked in `tests/helpers.js` (users, likes, message_requests).
- `npm test` needs `npx playwright install`; alternatively use the installed Chrome with a config that spreads
  `playwright.config.js` and sets `use.channel: 'chrome'`.
- `serve.json` (`cleanUrls: false`) keeps query strings like `?mode=login` locally, as on Vercel.
- 3 tests were already failing before 2026-10-26: the OTP dev-mode alert, the guest redirect, and the full name on the card.

---

## GitHub
- Repo: https://github.com/zivv1992-coder/HobbyMatch
- Live: https://hobby-connectionn.vercel.app/ (Vercel, auto-deploys from `main`)
- Firebase project `hobby-connection-adaca` is on the **Blaze** plan — Storage and Cloud Functions require it
