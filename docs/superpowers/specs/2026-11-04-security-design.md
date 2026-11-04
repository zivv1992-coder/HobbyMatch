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
- `users/{id}/private/contact` = `{ phone, fullName }`, readable by the owner and admin only.
- Public `users/{id}` keeps a short `displayName` instead of `fullName`.
- Copy the existing 15 users, then remove the fields from the public documents.
- Stop embedding the whole user object in `onclick` (`ui-render.js`); pass the email and read from `allUsers`.

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
