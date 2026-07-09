# CPE Room Reservation

A meeting room booking system for the CPE (Computer Engineering) department at
KMUTT — built to replace ad-hoc, conflict-prone room booking with a proper
web app: overlap-safe reservations, a calendar and live status dashboard, and
admin tools to manage rooms, users, and bookings department-wide.

## Features

**Everyone (once signed in):**
- Book a room, with server-side logic that rejects overlapping reservations
- **My Bookings** — view and cancel your own upcoming/past reservations
- **Calendar Dashboard** — day, week, and month views of what's booked, filterable by room size and searchable
- **Room Status Dashboard** — live view of which rooms are free/in-use right now, polling every 15s
- Self-service registration (name, student ID, email, program)

**Admins get everything above, plus:**
- **Manage → Rooms** — add/edit/delete rooms (name, size, location, capacity), with duplicate-name protection
- **Manage → Bookings** — search/filter and cancel *any* user's booking (Global Booking Management)
- **Manage → Users** — promote/demote accounts between `normal_user` and `admin`
- Book a room on behalf of another registered user (tick "Book for another user" and enter their email)

## Tech stack

- **Frontend + Backend:** [Next.js](https://nextjs.org) (App Router, Route Handlers) — one codebase for UI and API
- **Database + Auth:** [Firebase](https://firebase.google.com) — Firestore (via the Admin SDK only; all data access is routed through Next.js API routes, not accessed directly from the client) and Firebase Auth (email/password, with a `role` custom claim for RBAC)
- **Data fetching:** [SWR](https://swr.vercel.app) for all client-side reads
- **Styling:** Tailwind CSS

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure Firebase

Create `.env.local` in the project root with:

```bash
# Firebase client config (Project settings → General → Your apps)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Firebase Admin SDK (Project settings → Service accounts → Generate new private key)
FIREBASE_ADMIN_PROJECT_ID=
FIREBASE_ADMIN_CLIENT_EMAIL=
FIREBASE_ADMIN_PRIVATE_KEY=
```

In the Firebase console, enable **Authentication → Email/Password** and create
a **Firestore** database.

### 3. Run it

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). New accounts self-register
as `normal_user`; to grant the first admin:

```bash
npm run set-role -- <email> admin
```

## Project structure

```
src/
  app/
    (app)/            # authenticated pages: book, my-bookings, calendar, status, admin/*
    api/               # Route Handlers: rooms, bookings, users, register
    login/, register/  # public auth pages
  components/          # shared UI (Button, Input, Select, Modal, AppNav, ...)
  hooks/useAuth.ts      # Firebase auth state + role claim
  lib/
    api-client.ts       # client-side fetch wrappers for every API route
    server/              # Firestore access (Admin SDK) — rooms, bookings, users
    firebase/            # client SDK init, Admin SDK init, ID token verification
  types/                # shared TypeScript types
```

## Authorization model

Two roles: `normal_user` and `admin`, stored as a Firebase Auth custom claim
and checked **server-side on every API route** (not just hidden in the UI).
`normal_user` can only act on their own bookings; `admin` can act on anyone's
room, booking, or account.
