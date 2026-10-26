# שילוב תחביבה באתר — תוכנית

## Context
Today we built the onboarding demo `tahbiva-demo.html` (documented in `docs/tahbiva-onboarding.md` and `docs/tahbiva-session-2026-10-26.md`). The live site still uses one long sign-up form (`register.html` step3), and the app opens on "מי באזור". The goal:
- Registration starts with Tahbiva.
- The profile is built from her answers.
- The app opens on "פעילויות": what's happening around me, who I'd like to meet, which activity I'd go to. "מי באזור" stays, but as a secondary tab.
- **The header and the hamburger menu do not change.**

Decisions made (user's answers):
- Direct message requests to people who aren't matches yet.
- The demo's 10 categories replace the 7 on the site.
- Tab order becomes פעילויות · מי באזור · קונקשנז', with פעילויות as the default tab.
- **No "רוצה לנסות" anywhere** (confusing). Hobbies are only 💚 love.

## 0. Save for next time (first step of execution)
- Copy this plan to `docs/tahbiva-integration-plan.md`; link it from `docs/tahbiva-session-2026-10-26.md` and from memory (`tahbiva-demo-status.md`).
- Remove "רוצה לנסות" from the demo too (`tahbiva-demo.html`): discover cards become 💚 "הוסף לפרופיל" / "דלג"; the profile shows only "💚 התחביבים שלי".

## Comparison: demo vs. site

| Topic | Site today | Demo | What to do |
|---|---|---|---|
| Sign-up | Email/Google → OTP → one long form (`register.html` step3) | Tahbiva: this-or-that → categories → hobby tiles → city → nearby → discover → bio/age/phone → sign-up → photos | Tahbiva first, then auth, then save |
| Categories | 7 in `HOBBY_CATEGORIES` (config.js:34), `{emoji,label,items}`, no id | 10 with ids | Replace with the 10, same shape plus `id` |
| Hobbies | `hobbies[]` + `hobby` string | 💚 love only (tap = ✓) | `hobbies[]` as today; no new field |
| What I'm looking for | only boolean `romantic` | friends / activity partners / dating | new field `lookingFor[]`; `romantic` = includes dating (backward compatible) |
| About me | `hobbyDescription` | free-text bio | the same field |
| Photos | profile photo + one hobby image at sign-up; gallery in the drawer | one gallery, first photo = profile, "upload later" | Gallery at sign-up; first photo → `profilePhotoURL`, the rest → `hobbyImages[]` |
| Nearby | Discover by radius (`distanceKm`, firebase-logic.js:198) | 3 nearby + 1 activity right after picking hobbies | Real query (same source as `loadFeed`), names via `displayName` |
| Messages | match only (profiles-chat.js:47) | "💬 שלח הודעה" with a ready-made message | New request mechanism (below) |
| Events | "אירועים" tab; matched by hobby, no location filtering | "פעילויות" in my city | Rename + city/distance filtering + default tab |

## Implementation (in order)

### 1. Data — `config.js`
- Replace `HOBBY_CATEGORIES` with the demo's 10 categories (`CATS` in tahbiva-demo.html), keeping the `{emoji,label,items}` shape and adding `id`. Old hobbies stay as strings and still show; `hobby-picker.js` already supports custom hobbies.
- Add `TAHBIVA` = { TOT, LINES, SURPRISE, LOOKING } from the demo (data only, per the guardrail).
- Check that `js/hobby-picker.js` and `EVENT_HOBBIES`/`ACTIVITY_CATEGORIES` don't depend on the old category names.

### 2. New page `tahbiva.html` + `js/tahbiva.js`
- Port the demo, from the welcome screen through "מוכנ/ה?". Same style, Firebase v10 compat in `<head>`, `lang="he" dir="rtl"`.
- The "לידך" screen uses real data: users near the chosen city (lat/lng from `CITIES`, `distanceKm`) with shared hobbies. Show `displayName`, age, shared hobbies and distance only (no photo, matching how the site behaves today). Up to 3 people, plus one nearby activity.
- The "discover new hobbies" cards have two buttons only: 💚 "הוסף לפרופיל" / "דלג" (the 🎁 surprise card stays).
- The draft (hobbies, cats, city, lookingFor, bio, age, phone) is stored in `localStorage.tahbivaDraft`. "שמרו לי את הפרופיל" → `register.html?mode=register&from=tahbiva`.
- Tracking: `trackEvent('tahbiva_start' | 'tahbiva_done')` (js/analytics.js).

### 3. `register.html` — auth + finish
- Steps 1–2 (Google/OTP) stay as they are; `mode=login` is unchanged.
- When a draft exists, step3 is replaced by a short step:
  - name (prefilled from Google)
  - photo gallery + "אעלה תמונות אחר כך"
  - consent checkbox `#privacyConsent` (required, existing wording)
- Save through `saveProfileToFirestore` (firebase-logic.js:71), adding the fields `lookingFor`, `hobbyImages`. Uploads use `uploadProfilePhoto` and `uploadHobbyImageIndexed`. Then delete the draft → `profiles.html?new=1`.
- Without a draft (old link): redirect to `tahbiva.html`.
- `index.html`: "הרשמה" → `tahbiva.html`. Login and guest browsing stay.

### 4. `profiles.html` — activities first
- Tab bar (:378) order: `tabEvents` labeled "פעילויות" · `tabDiscover` "מי באזור" · `tabMatches`. Default `activeTab = 'events'` (profiles-state.js:13), plus a `#activities` hash. The header and hamburger stay untouched.
- At the top of the activities tab, a "מה קורה סביבי" section:
  - activities near me that match my hobbies (`eventMatchesUser`, profiles-events.js:622, plus distance)
  - a "מי לפגוש" strip with 3 people (same cards as "לידך")
  - then the existing list
- Location for activities: add `city`, `latitude`, `longitude` to `handleCreateEvent` (:955) with a city field (`createCityPicker`). Filter in `renderEventsGrid` (:632) by radius; old events without a city still show.
- Rename the remaining "אירוע/אירועים" text in the tab to "פעילות/פעילויות" (UI only; the `events` collection stays).

### 5. Message requests (new)
- Collection `message_requests/{from}_{to}`: `{ from, to, text, status:'pending'|'accepted'|'declined', createdAt }`.
- "💬 שלח הודעה" on people cards (Discover, "מי לפגוש", "לידך") opens a ready-made message about a shared hobby that can be edited. Saved through a new function in `firebase-logic.js`.
- In the קונקשנז' tab, a "בקשות" section at the top shows each request with "אישור / לא עכשיו".
  - Accept: `saveLike` in both directions → existing match → the message becomes the first chat message (`chats/{chatId}/messages`).
  - Decline: `status:'declined'`; the sender isn't told about the decline.
- Bell: count incoming requests in `profiles-notifications.js`. Optional: a push via `functions/index.js` with `displayName`.
- Rules: add `match /message_requests/{id} { allow read, write: if true; }` (open like the rest; security is backlog item #1), and update the rules section in CLAUDE.md.

### 6. Edit drawer — `js/profiles-edit-profile.js`
- The demo's card layout: photos, ✍️ about me, 💚 my hobbies, what I'm looking for (3 chips instead of the romantic toggle; `romantic` is derived from them).
- Also save `lookingFor` in `updateProfileInFirestore` (firebase-logic.js:151).

### 7. Docs
- Update CLAUDE.md (file structure, users fields, the new collection, rules) and `docs/tahbiva-onboarding.md`.

## More ideas worth adding (not in this plan unless approved)
- **Safety for message requests:** a limit of ~5 new requests per day, plus "חסימה/דיווח" right on the request (reuses the existing report).
- **Tahbiva for existing users:** a one-time banner "רוצה שתחביבה תעדכן לך את הפרופיל? 2 דקות" that runs the flow without auth and updates hobbies/city.
- **"מצטרף/ת" to an activity:** besides joining, invite a connection: "בא/ה איתי?" in one tap.
- **Reminder before an activity:** push the evening before (Cloud Functions already exist).
- **Tahbiva funnel in admin:** add the steps (`tahbiva_start`, `categories`, `nearby`, `tahbiva_done`) to "משפך הרשמה" to see where people drop off.

## Critical files
`config.js`, `tahbiva.html` + `js/tahbiva.js` (new), `register.html`, `index.html`, `profiles.html`, `js/profiles-state.js`, `js/profiles-events.js`, `js/profiles-matches.js`, `ui-render.js`, `js/profiles-edit-profile.js`, `js/profiles-notifications.js`, `firebase-logic.js`, `CLAUDE.md`.

Reused as-is: `createHobbyPicker`, `createCityPicker`, `distanceKm`, `displayName`, `saveLike`/`checkMatch`, `saveProfileToFirestore`, `uploadProfilePhoto`, `uploadHobbyImageIndexed`, `sendOTP`/`verifyOTP`, `trackEvent`.

## Execution: one step at a time
Do only one step, show what changed and how to check it, and **stop and wait for approval** before the next step. No commit without approval.
- **Step A:** save the plan (section 0) + remove "רוצה לנסות" from the demo
- **Step B:** data in `config.js` (10 categories + Tahbiva data)
- **Step C:** `tahbiva.html` + `js/tahbiva.js` (flow through "מוכנ/ה?", including real "לידך")
- **Step D:** `register.html` + `index.html` (auth → photos/consent → save)
- **Step E:** activities tab first + location for activities
- **Step F:** message requests
- **Step G:** edit drawer
- **Step H:** docs (CLAUDE.md, onboarding)

## Verification
- Run locally (`npx serve .` → http://localhost:3000; analytics are skipped on localhost).
- **New sign-up:** index → הרשמה → full Tahbiva flow → Google/OTP → photos/consent → `profiles.html?new=1`. Check the `users/{id}` document in the Firestore console: `hobbies`, `lookingFor`, `romantic`, `city`/lat/lng, `profilePhotoURL`, `hobbyImages`.
- **"Upload later":** saves with no photos and no errors.
- **Existing user:** login → app opens on פעילויות. Old hobbies still show; the drawer opens and saves.
- **Activities:** create a new activity with a city → appears for a nearby user and not for a distant one. An old activity without a city still appears.
- **Message requests:** with 2 users, send a request → it appears in the receiver's bell and בקשות section → accept → match + chat with the message. Decline → disappears and nothing goes to the sender.
- **Guest:** browsing and the signup wall work as before.
- Mobile: 375px width, nothing scrolls sideways.
