# Security: real sign-in, hidden personal data, closed rules

Backlog items #1–2. Goal: nobody can read phones or full names, impersonate a user, or read other people's
chats. Do this before paid promotion.

## Decided by the owner (2026-11-04)
- Sign-in: **Google first, email link as a rarely used backup.** The 6-digit code in the browser is removed.
- The old profile "גיל ש" (hidden characters in the email) and its likes stay as they are.

## Stage 1 — real sign-in (no rules change)
- `auth.js`: `authReady()`, `sendLoginLink()`. `register.html`: `continueAfterSignIn()` (Google + link).
- `hobbyMatchUser` stays as a cached copy of the profile; it is valid only with a Firebase Auth user of the same email
  (`profiles-boot.js`). Every older session logs in once.
- Firebase adds its own `mode` to the link, so the page's query string is kept in localStorage, not in the link.
- Needs in the console: Authentication → Sign-in method → Email/Password → **Email link** on.
- Limitation: an email link opens in the browser, not in the installed app. Google is the path for the app.

## Stage 2 — hide personal data (changes live data; stop for approval first)
Order matters: stage 1 live → publish the `private` rule → stage 2 code live → run the copy → remove public fields.
- `users/{id}/private/contact` = `{ fullName, phone }`, read/write by the verified owner and admin only.
- Public `users/{id}`: `fullName` holds the **shortened** name ("דן כ") and `phone` is gone. `displayName()` is
  idempotent, so the roughly 25 places that show names and `functions/index.js` need no change or deploy.
- `saveProfileToFirestore` / `updateProfileInFirestore` write both documents in one batch. A new `getMyProfile` merges
  them for the user's own session. `admin.html` merges them for the dashboard.
- Copy: a one-time admin.html button, run by the signed-in admin, so no private key or Admin SDK is needed. Report
  counts, keep a local backup first, and do not touch the old "גיל ש" document's id.
- `events`: `creatorName` and `interested[].name` hold the shortened name; the copy also cleans existing events.
- Once phone and full name are gone from public documents, the whole-user JSON in `onclick` exposes nothing private,
  so `ui-render.js` needs no change.

## Stage 3 — close the rules (test on the Firebase emulator first)
- Every "signed-in" check also requires `request.auth.token.email_verified == true`, `isAdmin()` included: with
  Email/Password on, anyone can create a password account for an unclaimed address, unverified. Google and email link
  are verified. Confirm the admin account is verified before publishing.
- Owner check: document id equals the sanitized `request.auth.token.email`, so ids need no migration.
- `users`: public read, write by owner. `likes`: `from` = me to create; `from` or `to` = me to delete/read.
  Accepting a request writes the sender's like too, so allow it when a matching `message_requests` doc exists.
- `chats`: only the two emails in the chat id. `message_requests`: read by `from`/`to`, status change by `to` only.
- `events`: public read, create/delete by the creator or admin, others change only `interested`.
- `feedback` / `reports`: signed-in create, admin read.
- Storage: there is no rules file in the repo. Read what is live, add `storage.rules`, write only to your own folder.

## Not in this project
- Emails stay visible to readers of `users`, because the document id is the email. Hiding them means new ids.
- Activity organizer phones stay public: the WhatsApp links for organizers depend on them.
