# Cloud Sync setup (Supabase, email + password)

KiBase stays **local-first**: every screen reads and writes `localStorage` instantly,
offline included. Supabase is an optional background copy used for backup and for
keeping several devices in step. Without the settings below the app simply runs
local-only (the Cloud Sync card is hidden).

## 1. Create the database

1. Create a project at supabase.com.
2. **SQL Editor > New query**, paste all of [`schema.sql`](./schema.sql), **Run**.
   It creates `profiles`, `meals_log`, `weight_log`, `workouts_log` with Row Level
   Security forced on, one policy per operation (`user_id = auth.uid()`), no access
   for signed-out visitors, server-side timestamps and size limits. Safe to re-run.
3. Optional check (should list 16 policies):
   ```sql
   select tablename, policyname, cmd, roles from pg_policies
   where schemaname = 'public' and tablename in ('profiles','meals_log','weight_log','workouts_log');
   ```

## 2. Sign-in: email + password, confirmed by an emailed link

The app creates accounts with an email and a password. Supabase stores the password
as a salted hash; KiBase never sees it.

**Authentication > Sign In / Providers > Email**
- Turn **Email** on and **Confirm email** on (people must open the link before they can log in).
- **Minimum password length: 8**. Under password requirements, require **lowercase, uppercase,
  digits and symbols**. The app already enforces upper case + number + symbol on the device;
  this makes Supabase enforce it too (nobody can skip the app).
- Optional: turn on *Prevent use of leaked passwords* (Pro plan).

**Email delivery (important)**: Supabase's built-in mail sender only delivers to your own team
members and is limited to a couple of emails per hour. Before real users sign up, set up
**Authentication > Emails > SMTP Settings** with a provider (Resend, Brevo, Postmark, ...).
Edit the **Confirm signup** template if you want it in KiBase's words; keep `{{ .ConfirmationURL }}`.

### Google / Apple sign-in: switched off for now
The app has the code for Google and Apple buttons, commented out in
`src/components/CloudSync.jsx` (search for "switched off"). To bring them back:
- **Google**: in Google Cloud Console create an OAuth client ID (type *Web application*).
  Authorized redirect URI: `https://<your-project-ref>.supabase.co/auth/v1/callback`.
  Paste the client ID and secret into Supabase (**Authentication > Sign In / Providers > Google**),
  then uncomment the buttons.
- **Apple**: needs a paid Apple Developer account. Create an App ID with *Sign in with
  Apple*, a **Services ID** (this is the client ID) with the return URL
  `https://<your-project-ref>.supabase.co/auth/v1/callback`, and a Sign in with Apple
  key (.p8). Supabase's Apple page generates the client secret from the key.
  **The web client secret expires every 6 months**: set a reminder to regenerate it.
- Update the Privacy Policy and Terms text in `src/lib/legal.js` to mention them again.

**Authentication > URL Configuration**
- Site URL: `https://okaballo.github.io/calorie-app/`
- Redirect URLs (allow list):
  - `https://okaballo.github.io/calorie-app/`
  - `http://localhost:5173/calorie-app/` (development)
  - `http://localhost:4173/calorie-app/` (`npm run preview`)

## 3. Connect the app

```
cp .env.example .env.local      # then fill in the two values
```
`VITE_SUPABASE_URL` and the **anon / publishable** key from *Project Settings > API*.
Never the `service_role` key. `.env*` files are git-ignored. `npm run deploy` builds
with `.env.local`, so the deployed site gets the values.

## After the person taps the email link

The link verifies the account at Supabase, then sends the person back to this app
(`Site URL` / the redirect list above). The app shows an **Account verified** screen.
If the link was opened on the same browser the person is also signed in; if it was opened
elsewhere (e.g. a different phone browser), the screen asks them to log in. An expired or
used link shows **Link expired**; they can sign up again or log in and tap *Resend Email*.

## What is stored where

| On the device (localStorage) | In Supabase |
|---|---|
| `mt.meals` | `meals_log` (one row per meal) |
| `mt.weights` | `weight_log` |
| `mt.workoutHistory` | `workouts_log` (finished workouts) |
| profile, photo, theme, language, own foods, saved meals, routines, cheat days, tracking day, workout in progress | columns of the user's `profiles` row |
| sync state (`kb.sync.*`), session (`kb.auth`) | — |

`kb.*` keys are never included in backup files, so a backup never carries a session
token or another device's sync state.

The only personal data Supabase holds besides the user's KiBase data is the email address
and the hashed password, kept in Supabase's own protected `auth.users` table. KiBase never
sees or stores a readable password.

## How sync behaves

- **Writes**: the app writes `localStorage` first (instant), then the change is queued
  in an outbox and pushed about a second later. Only changed records (or changed
  profile columns) are sent.
- **Offline**: pushes that fail stay queued (also across restarts) and go up when the
  device is back online, comes back to the foreground, or on the next app start.
  Nothing blocks or crashes; the Cloud Sync card shows "Offline, N changes waiting".
- **Pull**: on sign-in, app start, coming back online / to the app (at most once a
  minute) and every 5 minutes while open, only rows changed since the last pull are
  fetched (server timestamps, so device clocks do not matter).
- **Conflicts**: a record edited on this device and not yet uploaded is never
  overwritten by the cloud; it is uploaded and becomes the latest version. Otherwise
  the most recently uploaded version wins (per record / per profile column).
- **Deletes** are tombstones (`deleted_at`) so every device removes the record.
- **First sign-in on a device** joins the device's data with the account's (nothing is
  lost on either side). The account's profile and settings win; own foods, saved meals,
  routines and cheat days are merged.
- **Another account on the same device**: the app asks before replacing this device's
  data with that account's. One account's data is never uploaded into another's.
- **Backup restore** while signed in makes the cloud match the restored data.
- **Sign out** uploads what is pending (a few seconds at most), then keeps the data on
  the device; changes made while signed out sync when the same account signs back in.

## Things to know

- **iPhone home-screen app (standalone PWA)**: iOS opens the Google / Apple page in an
  in-app browser. Test the round trip on a real iPhone after setup; if iOS returns to
  Safari instead of the installed app, sign in from Safari once, or open the app from
  Safari, then add it to the Home Screen again.
- **Brand marks**: replace the Apple and Google marks in
  `src/components/CloudSync.jsx` with the official files (Apple Design Resources,
  Google sign-in branding) before launch.
- **Deleting an account**: delete the user in *Authentication > Users*; every row of
  theirs is deleted with it (`on delete cascade`). An in-app "Delete account" needs a
  server function (Edge Function with the service role), not the anon key.
- Tombstones are tiny and kept forever; prune old ones with a scheduled job if needed:
  `delete from meals_log where deleted_at < now() - interval '180 days';`
