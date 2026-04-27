# Tabletop Scheduler

A schedule-first coordination app for tabletop RPG campaigns. Built with Next.js + Firebase (Auth + Firestore). Player-first home, multi-campaign aware, system-agnostic.

## What's in v0.1

- Email/password signup + login (Firebase Auth)
- Create campaigns (name, system, venue, description)
- Invite players via shareable link with role (viewer / editor)
- Owner / Editor / Viewer permissions enforced server-side in Next.js server actions
- Sessions with date/time/venue
- Per-session RSVP (in / maybe / out)
- Player home: hero "next session" card + my-campaigns rail
- Per-player character link (sheet URL — no built-in sheet builder)

## Setup (one-time, ~15 min)

### 1. Create / pick a Firebase project
- https://console.firebase.google.com -> use an existing project or **Add project** (free)

### 2. Enable Email/Password sign-in
- Project sidebar -> **Build** -> **Authentication** -> **Get started**
- Sign-in method tab -> **Email/Password** -> Enable -> Save
- (Skip "Email link" — not used yet)

### 3. Create the Firestore database
- Sidebar -> **Build** -> **Firestore Database** -> **Create database**
- Start in **production mode** (we'll paste rules in step 4)
- Pick a region close to you (this can't be changed later)

### 4. Paste the security rules
- Firestore Database -> **Rules** tab
- Open `firestore.rules` from this repo, copy the whole file, paste it in
- Click **Publish**

### 5. Get the web 