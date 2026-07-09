# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. Every route except
`POST /api/register` requires a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

The token's `role` custom claim (`"admin"` | `"normal_user"`) determines access.
All request/response bodies are JSON. Timestamps are ISO 8601 strings.

Each endpoint below lists its scenarios — the situation, the HTTP method, and
the status code it returns.

---

## Rooms

### `/api/rooms`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | List all rooms | GET | 200 |
| 2 | No/invalid auth token | GET | 401 |
| 3 | Room created successfully | POST | 201 |
| 4 | Missing name, location, or capacity; invalid size; capacity outside the size's max (small ≤ 20, medium ≤ 50, large ≤ 80) | POST | 400 |
| 5 | No/invalid auth token | POST | 401 |
| 6 | Caller is `normal_user`, not admin | POST | 403 |
| 7 | Room name already used (case-insensitive) | POST | 409 |

**Request body (POST):** `{ "name": string, "size": "small"|"medium"|"large", "location": string, "capacity": number }`
**Response (200/201):** `{ "rooms": Room[] }` or `{ "room": Room }`

### `/api/rooms/[roomId]`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | Room updated successfully | PATCH | 200 |
| 2 | Invalid field (empty name/location, bad size, non-positive capacity, capacity over the effective size's max) | PATCH | 400 |
| 3 | No/invalid auth token | PATCH | 401 |
| 4 | Caller is `normal_user`, not admin | PATCH | 403 |
| 5 | Room does not exist | PATCH | 404 |
| 6 | New name already used by another room | PATCH | 409 |
| 7 | Room deleted successfully | DELETE | 204 |
| 8 | No/invalid auth token | DELETE | 401 |
| 9 | Caller is `normal_user`, not admin | DELETE | 403 |
| 10 | Room does not exist | DELETE | 404 |

**Request body (PATCH):** any subset of `{ "name": string, "size": "small"|"medium"|"large", "location": string, "capacity": number }`
**Response:** `200` → `{ "room": Room }`; `204` → no body

---

## Bookings

### `/api/bookings`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | List bookings (optionally filtered by `roomId`, `userId`, `from`, `to` query params) | GET | 200 |
| 2 | No/invalid auth token | GET | 401 |
| 3 | Booking created successfully | POST | 201 |
| 4 | Missing roomId/title, invalid start/end dates, start not before end, or start time in the past | POST | 400 |
| 5 | No/invalid auth token | POST | 401 |
| 6 | `bookForEmail` set by a caller who isn't admin | POST | 403 |
| 7 | Room does not exist, or `bookForEmail` doesn't match a registered user | POST | 404 |
| 8 | Requested time overlaps an existing booking in that room | POST | 409 |

**Request body (POST):**
```json
{
  "roomId": "string",
  "title": "string",
  "startTime": "iso-string",
  "endTime": "iso-string",
  "bookForEmail": "string (optional, admin only)"
}
```
`bookForEmail` is the Global Booking Management override: an admin can book on
behalf of whoever owns that email (resolved server-side against live Firebase
Auth data). Omit it, or pass your own email, to book for yourself.

**Response:** `200` → `{ "bookings": Booking[] }`; `201` → `{ "booking": Booking }`

### `/api/bookings/[bookingId]`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | Booking cancelled successfully (by its owner, or by any admin) | DELETE | 204 |
| 2 | No/invalid auth token | DELETE | 401 |
| 3 | Caller is neither the booking's owner nor an admin | DELETE | 403 |
| 4 | Booking does not exist | DELETE | 404 |

**Response:** `204` → no body

---

## Users

### `/api/users`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | List all accounts (Auth + Firestore profile joined) | GET | 200 |
| 2 | No/invalid auth token | GET | 401 |
| 3 | Caller is `normal_user`, not admin | GET | 403 |

**Response:** `200` → `{ "users": AdminUserSummary[] }`

### `/api/users/[uid]`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | Role updated successfully | PATCH | 200 |
| 2 | Invalid role, or `uid` is the caller's own account (self role-change is blocked) | PATCH | 400 |
| 3 | No/invalid auth token | PATCH | 401 |
| 4 | Caller is `normal_user`, not admin | PATCH | 403 |

**Request body:** `{ "role": "admin" | "normal_user" }`
**Response:** `200` → `{ "uid": string, "role": "admin"|"normal_user" }`

---

## Auth

### `/api/register`

| # | Scenario | Method | Code |
|---|---|---|---|
| 1 | Account created (always as `normal_user` — admin is only ever granted separately via `npm run set-role`) | POST | 201 |
| 2 | Missing name, student ID not exactly 11 digits, missing email, password under 6 characters, or invalid program | POST | 400 |
| 3 | Email already registered | POST | 409 |

**Request body:**
```json
{ "name": "string", "studentId": "11-digit string", "email": "string", "password": "string (min 6 chars)", "program": "regular"|"international"|"health_data_science" }
```
**Response:** `201` → `{ "uid": string }`
**Auth:** none — this is the only public route.

---

## Shared types

```ts
type UserRole = "admin" | "normal_user";
type RoomSize = "small" | "medium" | "large";
type Program = "regular" | "international" | "health_data_science";

interface Room {
  id: string;
  name: string;
  size: RoomSize;
  location: string;
  capacity: number;
  createdAt: string; // ISO
}

interface Booking {
  id: string;
  roomId: string;
  roomName: string;
  title: string;
  userId: string;
  userEmail: string | null;
  startTime: string; // ISO
  endTime: string;   // ISO
  createdAt: string; // ISO
}

interface AdminUserSummary {
  uid: string;
  email: string | null;
  role: UserRole;
  name: string | null;
  studentId: string | null;
  program: Program | null;
}
```
