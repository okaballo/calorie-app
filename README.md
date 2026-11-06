# KiBase

**KiBase is a calorie, macro, weight and workout tracker that lives on your phone and works
without internet or an account.** It is an installable PWA (add it to the home screen on iOS
or Android and it behaves like an app). Your data stays on your device; an optional free
account adds cloud backup and keeps several devices in step.

Live: https://okaballo.github.io/calorie-app

## Goal

Most trackers want a sign-up, a subscription and a connection before you can log a meal.
KiBase aims to be the opposite:

- **Local-first and private.** Every screen reads and writes `localStorage` instantly, offline
  included. The cloud is a background copy, never a requirement.
- **Food and training in one place.** Calories and macros, body weight and gym workouts share
  one app and one set of streaks, so you can see how eating, training and weight move together.
- **Built for Egypt and the Middle East as well as everywhere else.** The built-in food database
  has about a thousand items with Arabic names, Egyptian dishes and the region's restaurant
  chains, and the whole UI works in English and right-to-left Arabic.
- **Fast and polished.** Native-feeling gestures, springs and sheets, several themes, and an
  animated launch screen, with a small dependency list.

## What it does

**Home**
- Calorie ring and protein / carbs / fat rings for the active day, with the day's meals.
- *Log Meal* from the food database, your own items, or saved meals. Amounts are in grams and
  the macros are scaled per 100 g (`scale` in `src/lib/calc.js`). A *Meal Divider* splits a
  cooked batch by weight.
- **Manual tracking days:** the day only changes when you tap *Start New Day*, so a late-night
  meal still counts for the day you are on. Deleting the current day returns to the previous
  one, which undoes an accidental Start New Day.
- Week strip (swipe between weeks), cheat days, and analytics for week / month / 6 months /
  year, including calories burned.
- **Calorie streak:** consecutive closed days inside a goal-dependent range (Cut 60%, Maintain
  90% or Bulk 95% of goal, up to goal + 10%). Cheat days freeze the streak instead of breaking it.

**Workout**
- Saved routines, started with a timer and logged set by set (kg, reps, tick when done), with
  your previous numbers as hints.
- Supersets, drop sets, drag-to-reorder, swap exercise, bodyweight exercises (volume uses your
  latest weigh-in plus any added weight), and your own custom exercises.
- A built-in exercise database with muscle and equipment filters, plus split suggestions
  (Push/Pull/Legs, Upper/Lower, Full Body, Bro Split, Arnold) that pre-fill a new routine.
- Workout history, volume stats, and a **workout streak** counted in weeks that reach your
  weekly workout goal.

**Weight**: log weigh-ins by date and see the trend line and total change.

**Profile**
- Name, photo, body stats, and *Plan & Goals*: calories and macros are suggested from the
  Mifflin-St Jeor formula, your activity level and your goal (protein 2 g/kg, fat 25% of
  calories, carbs the rest, never below 1,200 kcal), and you can overwrite any number.
- Themes (System, Light, Dark, Neumorphism, Dark Neumorphism), English / Arabic.
- **Backup & restore** to a JSON file, validated on import.
- **Cloud Sync** (optional), plus Privacy Policy and Terms.

## How it works

- **Storage.** All state lives in `localStorage` under `mt.*` keys (meals, weights, workout
  history, profile, routines, custom foods and exercises, and so on). The full list is at the top
  of `src/App.jsx`. `useLocalStorage` keeps React state and storage in step.
- **Pure logic, thin UI.** The maths is in plain functions with tests: `calc.js` (macros, TDEE,
  tracking days, analytics), `streaks.js` (streaks are computed on render, never stored),
  `workouts.js` (workout data shapes and volume), `backup.js`, `password.js`.
- **Cloud sync** (`src/lib/sync/`). Local writes are diffed into a persisted outbox and pushed
  about a second later; pulls fetch only rows changed since a server-side cursor. Deletes are
  tombstones, conflicts resolve per record (a pending local edit is never overwritten), and
  Row Level Security in `supabase/schema.sql` limits every user to their own rows. Details are
  in the setup section below.
- **Offline.** `public/sw.js` caches the app shell, so it loads with no connection and
  updates when a connection is available.
- **Performance.** The food database is its own chunk loaded after the first paint; each tab is
  memoised separately so editing a workout does not re-render Home; heavy workout cards are
  `React.memo`.
- **i18n.** UI strings are written in English and passed through `t()`; Arabic lives in
  `src/lib/i18n.js` and switches the layout to right-to-left. Stored values stay in English.

## Stack

React 19, Vite 7, Tailwind CSS 4, Framer Motion, `@use-gesture/react`, and
`@supabase/supabase-js` for optional sync. No backend of its own: Supabase is the only server.

## Getting started

```
npm install
npm run dev        # http://localhost:5173/calorie-app/
```

| Script | What it does |
|---|---|
| `npm run dev` | Vite dev server |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Serve the build at `http://localhost:4173/calorie-app/` |
| `npm test` | Run `tests/` with the Node test runner (calorie maths, streak rules) |
| `node scripts/check-foods.mjs` | Sanity-check the food database (duplicates, Arabic names, calories vs macros) |
| `npm run deploy` | Build, then publish `dist/` to GitHub Pages (`gh-pages`) |

The app is served from `/calorie-app/` (`base` in `vite.config.js`). Cloud Sync is off until you
add the two Supabase values (see below); without them the app runs local-only.

## Project layout

```
src/App.jsx        owns all saved data, the theme and the swipeable tab layout
src/tabs/          Home, Weight, Workout, Profile
src/components/    sheets, food picker, exercise cards, charts, streaks, shared UI (ui.jsx)
src/lib/           calc, streaks, workouts, backup, i18n, theme, exercise database
src/lib/food-data/ the built-in foods (generic, dishes, restaurant brands)
src/lib/sync/      Supabase auth context, sync engine, table mapping
supabase/          schema.sql for the cloud database
scripts/           check-foods.mjs
tests/             logic tests
public/            manifest, service worker, icons
```

---

## Cloud Sync setup (Supabase, email + password)

KiBase stays **local-first**: every screen reads and writes `localStorage` instantly,
offline included. Supabase is an optional background copy used for backup and for
keeping several devices in step. Without the settings below the app simply runs
local-only (the Cloud Sync card is hidden).

### 1. Create the database

1. Create a project at supabase.com.
2. **SQL Editor > New query**, paste all of [`supabase/schema.sql`](./supabase/schema.sql), **Run**.
   It creates `profiles`, `meals_log`, `weight_log`, `workouts_log` with Row Level
   Security forced on, one policy per operation (`user_id = auth.uid()`), no access
   for signed-out visitors, server-side timestamps and size limits. Safe to re-run.
3. Optional check (should list 16 policies):
   ```sql
   select tablename, policyname, cmd, roles from pg_policies
   where schemaname = 'public' and tablename in ('profiles','meals_log','weight_log','workouts_log');
   ```

### 2. Sign-in: email + password, confirmed by an emailed link

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

### 3. Connect the app

```
cp .env.example .env.local      # then fill in the two values
```
`VITE_SUPABASE_URL` and the **anon / publishable** key from *Project Settings > API*.
Never the `service_role` key. `.env*` files are git-ignored. `npm run deploy` builds
with `.env.local`, so the deployed site gets the values.

### After the person taps the email link

The link verifies the account at Supabase, then sends the person back to this app
(`Site URL` / the redirect list above). The app shows an **Account verified** screen.
If the link was opened on the same browser the person is also signed in; if it was opened
elsewhere (e.g. a different phone browser), the screen asks them to log in. An expired or
used link shows **Link expired**; they can sign up again or log in and tap *Resend Email*.

### What is stored where

| On the device (localStorage) | In Supabase |
|---|---|
| `mt.meals` | `meals_log` (one row per meal) |
| `mt.weights` | `weight_log` |
| `mt.workoutHistory` | `workouts_log` (finished workouts) |
| profile, photo, theme, language, own foods, saved meals, routines, custom exercises, cheat days, tracking day, workout in progress | columns of the user's `profiles` row |
| sync state (`kb.sync.*`), session (`kb.auth`) | — |

`kb.*` keys are never included in backup files, so a backup never carries a session
token or another device's sync state.

The only personal data Supabase holds besides the user's KiBase data is the email address
and the hashed password, kept in Supabase's own protected `auth.users` table. KiBase never
sees or stores a readable password.

### How sync behaves

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

### Things to know

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
