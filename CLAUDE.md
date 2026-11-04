# HobbyMatch Israel — Project Memory & Guardrails

## Tech Stack
- **Frontend:** HTML5, Tailwind CSS, Vanilla JavaScript
- **Database:** Firebase Firestore
- **Storage:** Firebase Storage (hobby images)
- **Auth:** Firebase Auth — Google first, email link as a backup (`auth.js`)
- **Hosting:** GitHub Pages
- **Firebase SDK:** v10 Compat mode via CDN — NO Admin SDK, NO private keys

---

## File Structure
```
hobby-match/
├── index.html              ← Landing page ("הרשמה" → tahbiva.html)
├── tahbiva.html            ← Sign-up starts here: Tahbiva 🦉 onboarding (before auth) → draft in localStorage
├── register.html           ← Login + sign-up auth (Google / email link) → step4 saves the Tahbiva draft
├── profiles.html           ← Main app shell — tabs: פעילויות (home) · מי באזור · קונקשנז'; chat
├── config.js               ← Firebase config, CITIES, HOBBY_CATEGORIES, HOBBY_EMOJI, TAHBIVA
├── auth.js                 ← Sign-in helpers + session management
├── firebase-logic.js       ← CRUD: profiles, likes, image uploads
├── ui-render.js            ← Profile card rendering + My Matches tab
└── js/
    ├── tahbiva.js               ← Tahbiva flow: this-or-that → categories → hobbies → looking for → partners → discover → my hobbies → city → nearby → about → ready
    ├── profiles-boot.js         ← App init, session check, tab routing (members open on פעילויות, guests on מי באזור)
    ├── profiles-state.js        ← Shared state (me, allProfiles, allEventsData…)
    ├── profiles-utils.js        ← Helpers: sanitizeEmail, formatWhatsApp, distance…
    ├── profiles-ui.js           ← Discover feed, filters, profile cards
    ├── profiles-matches.js      ← My Matches tab, like/unmatch logic
    ├── profiles-events.js       ← פעילויות tab: "מה קורה סביבי" (activities only), 50 km filter, create (with city), join/leave
    ├── profiles-chat.js         ← Real-time chat between matched users
    ├── profiles-requests.js     ← "💬 שלח הודעה" to non-matches + "בקשות" in קונקשנז' (accept → match + chat)
    ├── profiles-notifications.js← FCM push notifications, bell badge, panel
    ├── profiles-edit-profile.js ← "הפרופיל שלי" drawer in cards: photos, about, looking-for, partners (edit/remove/add), hobbies (compact picker), want to try, details
    ├── analytics.js             ← Anonymous sign-up funnel tracking (trackEvent) → admin "משפך הרשמה"
    ├── city-picker.js           ← Searchable city field (type a letter → matching cities, א-ב order)
    └── hobby-picker.js          ← Category bubbles → sub-hobby pills + custom hobbies (register + edit), HOBBY_CATEGORIES in config.js
```

---

## Firestore Collections

### `users/{email_sanitized}`
Document ID = email with `@` → `_at_` and `.` → `_dot_`
```
{ fullName (short: "דן כ"), email, age, city, hobby, hobbies: string[], wantToTry: string[], hobbyDescription,
  lookingFor: ('friends'|'partners'|'romantic')[], romantic, partnerTypes: string[], notForMe: string[], totAnswers: number[],
  profilePhotoURL, hobbyImages: string[], hobbyImageUrl, latitude, longitude, createdAt }
```
Phone and the real full name live in `users/{id}/private/contact` = `{ fullName, phone }` (owner + admin only, written with
the public document in one batch). Read your own with `getMyProfile`. The older phone/full name in public documents is
moved by the one-time admin.html button "העברת טלפונים ושמות לאזור הפרטי".
`wantToTry` = "🌱 רוצה לנסות" (Tahbiva discover card "🤔 רוצה לנסות", ⇄ in Tahbiva's my-hobbies, typed in the edit drawer; also matches activities).
`partnerTypes` = "🤝 מחפש/ת שותפים ל…": `TAHBIVA.PARTNERS` ids (shown by their `short` label) + the user's own
free text from the edit drawer. Read with `partnerLabels(user)` (ui-render.js) — free text is other users' text → escape.
`notForMe` = discover cards marked "🙅 לא בשבילי" (never shown). `totAnswers` = "this or that" picks — preference only.
Phone is **required** (Tahbiva + edit drawer) but is **never shown** to other users — since 2026-11-01 matches talk only in the in-app chat (no WhatsApp buttons). WhatsApp links remain only for activity organizers.
`lookingFor` = what the user is looking for (Tahbiva + edit drawer). `romantic` = `lookingFor` includes `'romantic'`,
kept for the ❤️ badge and the discover filter (older profiles have only `romantic`).
Photos are **one public gallery** (since 2026-10-26): `hobbyImages` = all photos (me + hobbies), `profilePhotoURL` =
`hobbyImageUrl` = the first one. Read them with `userPhotos(user)` (ui-render.js), which also folds in an older separate
`profilePhotoURL`. Only the phone is hidden (from everyone, matches included).
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
Source of truth: **`firestore.rules`** (repo root) = what is published in the Firebase console
(Firestore → Rules). Edit the file, then copy it into the console and Publish — copying from a chat/terminal
wraps long lines and breaks strings. Most collections are still `if true` (see docs/BACKLOG.md #1–2);
`message_requests` allows create(pending) + status-only update, no delete. Published 2026-10-26.

---

## Privacy Policy
- `privacy.html` — דף פרטיות מלא לפי חוק הגנת הפרטיות הישראלי, נגיש מכל דף
- בדף ההרשמה (`register.html`) מופיעה הודעה שמספר הטלפון נשמר אך **לא מוצג** למשתמשים אחרים — גם לא לקונקשנים; השיחה מתנהלת בצ'אט באפליקציה

---

## Admin Auth
- `admin.html` מוגן עם Firebase Auth (Email/Password)
- רק המייל שמוגדר כ-`ADMIN_EMAIL` ב-admin.html יכול להתחבר
- Dashboard נטען רק אחרי אימות מוצלח (`onAuthStateChanged`)

---

## Sign-up Flow (Tahbiva first)
1. `index.html` "הרשמה" (and the guest sign-up wall) → `tahbiva.html`. No auth yet.
2. Tahbiva (spec: `תחביבה חדש.txt`, texts: `docs/tahbiva-texts.md`) builds a draft in `localStorage[TAHBIVA_DRAFT_KEY]`
   (`tahbivaDraft2` since 2026-10-30). Order: hi → 3× this-or-that → categories (7) → hobby tiles → looking for → hobby
   partners (4) → **one** discover card (💚 / 🤔 רוצה לנסות / 🙅 לא בשבילי) → my hobbies (💚 · 🌱 · 🤝, ⇄ moves) → city
   (quick picks = cities with most users) → nearby → bio / age / phone (one per screen) → ready.
   **"This or that" never adds hobbies** — it only reorders categories and suggestions ("Tahbiva suggests, the user chooses").
   "לידך" shows real users within 50 km by shared hobbies, shared want-to-try and shared partners (`displayName` only, no photo).
3. "שמרו לי את הפרופיל" → `register.html?mode=register&from=tahbiva` → Google or email link (below).
4. New user + finished draft → **step4**: name, one photo gallery (first = profile photo, rest = hobbyImages,
   "אעלה תמונות אחר כך"), privacy consent → `saveProfileToFirestore` → draft cleared → `profiles.html?new=1`.
5. `register.html` without a draft and not `mode=login` → redirected to `tahbiva.html`. The old long form (step3)
   remains only as a fallback (e.g. a new email entered in login mode).

## Auth Flow (Firebase Auth)
1. Google popup, or `sendLoginLink` (auth.js) emails a sign-in link. The address and the page's query string wait in
   localStorage, because Firebase adds its own `mode` to the link. Opened elsewhere → register.html asks for the email.
2. `continueAfterSignIn` (register.html): existing user → session + app; new user → step4 / step3.
3. `hobbyMatchUser` in localStorage is a cached profile, not proof: `profiles-boot.js` requires a Firebase user with the
   same email, otherwise it clears the session and sends to login.
4. Security stages: `docs/superpowers/specs/2026-11-04-security-design.md`.

---

## Match System
- Like ID: `senderEmail_receiverEmail` (sanitized)
- On like: check if reverse like exists → MATCH → push to both users (`functions/index.js`)

---

```javascript
// config.js
const FCM_VAPID_KEY = "BJ9FYrOsn301Wfq9tA6em9wfQO8sQH3Ku13ksh7Blc9s45WLNbPRZo68Ip3bKTECpzGqQ0UoTjDlvdgEGLixk2I"; // Push notifications
```

---

## Guardrails

- Firebase v10 Compat (Namespaced) syntax only — no modular imports
- All HTML files load Firebase via CDN in `<head>` before custom JS
- Images → upload to Storage first, save Download URL to Firestore (no Base64)
- `<html lang="he" dir="rtl">` on every page, all UI text in Hebrew
- Other users' names are always shown via `displayName(fullName)` ("דן כהן" → "דן כ", in `js/profiles-utils.js`;
  copy in `functions/index.js` for push texts). Full name only for the user themself and in admin.html
- Open work items: `docs/BACKLOG.md`
- Every async op (Firebase, uploads) must have `try-catch` with Hebrew error message
- `config.js` = config/data only · `auth.js` = auth/session only · `firebase-logic.js` = Firestore/Storage only
- Static Web App — no server-side code, compatible with GitHub Pages / Netlify / cPanel
- `sw.js` serves files **network-first** (cache = offline only) → still bump `CACHE_NAME` on every release that changes HTML/JS, so the offline copy stays current
- Other users' text in HTML → `escapeHtml()`; inside an `onclick="…('…')"` string → `jsArg()`; in href/src → `safeUrl()` (ui-render.js)

---

## Tests (Playwright, `tests/`)
- Firebase is mocked in `tests/helpers.js` (users, likes, message_requests).
- **`npm run test:chrome`** — runs on the installed Chrome (`playwright.chrome.config.js`). `npm test` needs `npx playwright install` first.
- `serve.json` (`cleanUrls: false`) keeps query strings like `?mode=login` locally, as on Vercel.
- Known failures: the guest redirect and the full name on the card (before 2026-10-26), and "phone is required" in tahbiva.spec.js (old text).

---

## GitHub
- Repo: https://github.com/zivv1992-coder/HobbyMatch
- Live: https://hobby-connectionn.vercel.app/ (Vercel, auto-deploys from `main`)
- Firebase project `hobby-connection-adaca` is on the **Blaze** plan — Storage and Cloud Functions require it
