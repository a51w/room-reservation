# API Reference

All routes are Next.js Route Handlers under `src/app/api/`. Every route except
`POST /api/register` requires a Firebase ID token:

```
Authorization: Bearer <firebase-id-token>
```

The token's `role` custom claim (`"admin"` | `"normal_user"`) determines access.
Requests without a valid token get `401 Unauthorized`; requests from a
`normal_user` hitting an admin-only route get `403 Forbidden`.

All request/response bodies are JSON. Timestamps are ISO 8601 strings.

---

## Rooms

### `GET /api/rooms`
List all rooms, ordered by name.

- **Auth:** any signed-in user
- **Response** `200`
  ```json
  { "rooms": [ { "id": "string", "name": "string", "size": "small|medium|large", "location": "string", "capacity": 20, "createdAt": "iso-string" } ] }
  ```

### `POST /api/rooms`
Create a room.

- **Auth:** admin only
- **Body**
  ```json
  { "name": "string", "size": "small|medium|large", "location": "string", "capacity": 20 }
  ```
- **Validation:** name/location required; size must be `small`/`medium`/`large`; capacity must be a positive integer not exceeding the size's max (small ≤ 20, medium ≤ 50, large ≤ 80); name must not already exist (case-insensitive).
- **Response** `201` `{ "room": Room }`
- **Errors:** `400` invalid field, `403` not admin, `409` name already used

### `PATCH /api/rooms/[roomId]`
Update a room. All fields optional; only provided fields are changed.

- **Auth:** admin only
- **Body** (any subset)
  ```json
  { "name": "string", "size": "small|medium|large", "location": "string", "capacity": 20 }
  ```
- **Validation:** same per-field rules as create; capacity is checked against whichever size is in effect after the update; name uniqueness check excludes the room being edited.
- **Response** `200` `{ "room": Room }`
- **Errors:** `400` invalid field, `403` not admin, `404` room not found, `409` name already used

### `DELETE /api/rooms/[roomId]`
Delete a room.

- **Auth:** admin only
- **Response** `204` no body
- **Errors:** `403` not admin, `404` room not found

---

## Bookings

### `GET /api/bookings`
List bookings, filtered in memory (server never combines an equality + range
Firestore filter — see `src/lib/server/bookings.ts` for why).

- **Auth:** any signed-in user (no row-level restriction — any signed-in user can see any booking's room/time/title/owner; this is by design for the Calendar Dashboard and Room Status Dashboard, which show everyone's bookings)
- **Query params** (all optional)
  | Param | Type | Meaning |
  |---|---|---|
  | `roomId` | string | only bookings for this room |
  | `userId` | string | only bookings owned by this user |
  | `from` | ISO date | only bookings ending on/after this instant |
  | `to` | ISO date | only bookings starting on/before this instant |
- **Response** `200` `{ "bookings": Booking[] }`

### `POST /api/bookings`
Create a booking. Rejects overlapping bookings for the same room via a
Firestore transaction.

- **Auth:** any signed-in user
- **Body**
  ```json
  {
    "roomId": "string",
    "title": "string",
    "startTime": "iso-string",
    "endTime": "iso-string",
    "bookForEmail": "string (optional, admin only)"
  }
  ```
- **`bookForEmail`:** admin-only "Global Booking Management" escape hatch — books the room on behalf of whoever owns that email instead of the caller. Resolved server-side against live Firebase Auth data (not a client-cached list). Omit it (or pass your own email) to book for yourself.
- **Validation:** roomId/title required; startTime < endTime; startTime must not be in the past.
- **Response** `201` `{ "booking": Booking }`
- **Errors:**
  - `400` missing/invalid field, start not before end, or start in the past
  - `403` `bookForEmail` set by a non-admin
  - `404` room not found, or `bookForEmail` doesn't match a registered user
  - `409` overlaps an existing booking in that room

### `DELETE /api/bookings/[bookingId]`
Cancel a booking.

- **Auth:** the booking's owner, or any admin (Global Booking Management)
- **Response** `204` no body
- **Errors:** `403` not the owner and not an admin, `404` booking not found

---

## Users

### `GET /api/users`
List every account (Firebase Auth, joined with the Firestore profile when one
exists — admin-created accounts predate self-registration and have no profile).

- **Auth:** admin only
- **Response** `200`
  ```json
  { "users": [ { "uid": "string", "email": "string|null", "role": "admin|normal_user", "name": "string|null", "studentId": "string|null", "program": "regular|international|health_data_science|null" } ] }
  ```

### `PATCH /api/users/[uid]`
Promote/demote a user.

- **Auth:** admin only
- **Body** `{ "role": "admin" | "normal_user" }`
- **Response** `200` `{ "uid": "string", "role": "admin|normal_user" }`
- **Errors:** `400` invalid role, or `uid` is your own (self role-change is blocked — use `npm run set-role` if genuinely needed), `403` not admin

---

## Auth

### `POST /api/register`
Self-service sign-up. Always creates a `normal_user` — admin is only ever
granted separately (`npm run set-role`), never through this endpoint.

- **Auth:** none (public)
- **Body**
  ```json
  { "name": "string", "studentId": "11-digit string", "email": "string", "password": "string (min 6 chars)", "program": "regular|international|health_data_science" }
  ```
- **Response** `201` `{ "uid": "string" }`
- **Errors:** `400` invalid/missing field, `409` email already registered

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
```
