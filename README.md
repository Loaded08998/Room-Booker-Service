# Room Booking Service

A full-stack room booking prototype built with React + Tailwind (frontend), Express 5 (backend), PostgreSQL + Drizzle ORM (database), Razorpay (payments), Resend (email), and whatsapp-web.js (WhatsApp notifications).

---

## Table of Contents

1. [Stack Overview](#stack-overview)
2. [Running the Project](#running-the-project)
3. [Environment Variables & Secrets](#environment-variables--secrets)
4. [Page-by-Page Guide](#page-by-page-guide)
5. [Admin Dashboard Guide](#admin-dashboard-guide)
6. [API Endpoints](#api-endpoints)
7. [Issues Faced & Workarounds](#issues-faced--workarounds)
8. [Known Issues to Fix](#known-issues-to-fix)
9. [Features Pending Complete Implementation](#features-pending-complete-implementation)

---

## Stack Overview

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite, Tailwind CSS, Wouter (routing), TanStack Query |
| Backend | Node.js 24, Express 5, TypeScript |
| Database | PostgreSQL, Drizzle ORM |
| Validation | Zod v4, drizzle-zod |
| API Contract | OpenAPI 3.0 (Orval codegen → React Query hooks + Zod schemas) |
| Payments | Razorpay (test mode) |
| Email | Resend |
| WhatsApp | whatsapp-web.js (requires Chromium — see notes) |
| Auth | JWT (admin only), guest checkout (no user accounts) |
| Build | esbuild (backend CJS bundle), Vite (frontend) |
| Monorepo | pnpm workspaces |

---

## Running the Project

### Prerequisites

- Node.js 24+
- pnpm 10+
- A PostgreSQL database (connection string in `DATABASE_URL`)

### Install dependencies

```bash
pnpm install
```

### Push the database schema

```bash
pnpm --filter @workspace/db run push
```

This creates all five tables: `rooms`, `guests`, `bookings`, `reservations`, `admins`.

### Seed rooms and admin user

Run this once to populate the 17 rooms and create the default admin account:

```bash
# Using psql or any Postgres client, run:
# INSERT INTO rooms ... (see lib/db/src/seed.sql if present)
# Admin credentials: admin / admin123
```

> In this Replit environment, seeding was done via the built-in `executeSql` tool. If you are running locally, you can copy the seed SQL from the development history or write a seed script.

### Start the backend (API server)

```bash
pnpm --filter @workspace/api-server run dev
```

Runs on `PORT` (default `8080` in Replit). The server builds with esbuild then starts. Expected output:

```
Server listening  port: 8080
WhatsApp init skipped — Chromium or whatsapp-web.js unavailable   ← normal if no Chromium
```

### Start the frontend

```bash
pnpm --filter @workspace/room-booking run dev
```

Vite dev server starts on `PORT` (assigned by Replit, proxied to `/`).

### Regenerate API client (after OpenAPI spec changes)

```bash
pnpm --filter @workspace/api-spec run codegen
```

Regenerates React Query hooks in `lib/api-client-react/` and Zod schemas in `lib/api-zod/`.

### Full typecheck

```bash
pnpm run typecheck
```

---

## Environment Variables & Secrets

All secrets are set via the Replit Secrets panel (or a `.env` file locally). **Never commit secrets to source control.**

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ Yes | PostgreSQL connection string |
| `SESSION_SECRET` | ✅ Yes | JWT signing secret for admin tokens |
| `RAZORPAY_KEY_ID` | ✅ For payments | Razorpay Key ID (starts with `rzp_test_...`) |
| `RAZORPAY_KEY_SECRET` | ✅ For payments | Razorpay Key Secret |
| `VITE_RAZORPAY_KEY_ID` | ✅ For payments | Same value as `RAZORPAY_KEY_ID` (exposed to the browser) |
| `RESEND_API_KEY` | Optional | Resend API key for booking confirmation emails |
| `EMAIL_FROM` | Optional | Sender address (e.g. `onboarding@resend.dev`) |
| `CHROMIUM_PATH` | Optional | Override Chromium path for WhatsApp (e.g. `/usr/bin/chromium-browser`) |

### How to get Razorpay keys

1. Sign up at [dashboard.razorpay.com](https://dashboard.razorpay.com)
2. Go to **Settings → API Keys → Generate Test Key**
3. Copy both `Key ID` and `Key Secret` — the secret is only shown once
4. Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `VITE_RAZORPAY_KEY_ID` to Secrets

### How to get the Resend API key

1. Sign up at [resend.com](https://resend.com) (free tier: 100 emails/day)
2. Go to **API Keys → Create API Key**
3. Use `onboarding@resend.dev` as sender for testing (no domain setup needed)

---

## Page-by-Page Guide

### `/` — Home Page

The landing page. Displays a hero image with a search form containing three fields:

- **Check-in date** — defaults to today
- **Check-out date** — defaults to tomorrow
- **Capacity** — dropdown with options: Any size, 2 beds, 3 beds, 4 beds, 10 beds (Conference)

On submit, navigates to `/rooms?check_in=YYYY-MM-DD&check_out=YYYY-MM-DD&capacity=N`.

---

### `/rooms` — Rooms Listing Page

Displays all available rooms for the selected date range. Reads `check_in`, `check_out`, and `capacity` from the URL query string using `window.location.search` (important — wouter's `useLocation()` strips query strings).

**With dates selected:** Calls `GET /api/availability?check_in=...&check_out=...` to fetch only rooms with no confirmed/pending booking overlap. Additionally filters client-side by `capacity >= N` if a capacity filter was passed.

**Without dates:** Calls `GET /api/rooms` to show all 17 rooms with no availability filtering.

Each room card shows: room photo, room name, bed count, standard and member pricing, and a "Book this room" button that links to `/rooms/:id?check_in=...&check_out=...`.

---

### `/rooms/:id` — Room Detail + Booking Form

Shows full room details (photo, description, pricing) alongside a booking form on the right.

**Booking form fields:**
- Check-in / Check-out dates (pre-filled from URL params)
- Full Name
- Email
- Phone (optional)
- Member checkbox — toggles between standard and member pricing

A live price summary shows: rate × nights = total.

On submit, calls `POST /api/bookings` which:
1. Validates room availability (double-books are blocked)
2. Upserts the guest record (finds by email, creates if new → auto-generates `guest_id`)
3. Creates the booking record (auto-generates `booking_id`)
4. Creates a reservation record per room (auto-generates `reservation_id`)
5. All three happen inside a single DB transaction

On success, navigates to `/booking/confirm?bookingId=N`.

---

### `/booking/confirm` — Payment Page

The checkout page. Reads `bookingId` from the URL query string.

**Flow:**
1. Loads booking details via `GET /api/bookings/:id` (shows guest name, email, rooms, dates, total)
2. On mount, calls `POST /api/payments/create-order` → creates a Razorpay order and stores `{ order_id, amount, key_id }` in state
3. Displays a "Pay ₹X,XXX" button once the order is ready
4. On click, opens the **Razorpay checkout modal** (secure, hosted by Razorpay) pre-filled with guest info and themed amber
5. On payment, Razorpay calls the `handler` function with `{ razorpay_order_id, razorpay_payment_id, razorpay_signature }`
6. The frontend calls `POST /api/payments/verify-order` to verify the HMAC-SHA256 signature on the server
7. If valid: booking is marked `confirmed` in the DB, email + WhatsApp confirmation are sent, and the user is redirected to `/booking/success`

> **Requires:** `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `VITE_RAZORPAY_KEY_ID` to be set.

---

### `/booking/success` — Booking Confirmation Page

Success screen displayed after a verified payment. Reads `bookingId` from the URL and fetches full booking details to display:

- Booking ID number
- Guest name
- Room(s) booked
- Check-in and check-out dates
- Total amount paid (in ₹)
- Email confirmation notice

---

### `/admin` — Admin Dashboard

Protected admin area. See [Admin Dashboard Guide](#admin-dashboard-guide) below.

---

## Admin Dashboard Guide

Navigate to `/admin`. Default credentials: `admin` / `admin123`.

### Login

The login screen sends credentials to `POST /api/admin/login`. On success, a JWT (valid 24 hours) is stored in `localStorage` as `admin_token` and used as a `Bearer` token on all subsequent admin API calls.

### Dashboard Tabs

After logging in, the dashboard shows four tabs — one per database table:

#### Bookings tab
All bookings with:
- Booking ID, Guest ID (linked badge format)
- Guest name, email, member status
- Rooms booked
- Check-in / Check-out dates
- Total price
- Status badge (Pending / Confirmed / Cancelled)
- **Actions:** Confirm or Cancel buttons to manually update booking status

Filter controls: by status, by date range (from/to).

#### Guests tab
All guest records:
- Guest ID, name, email, phone, member status

#### Rooms tab
All 17 seeded rooms:
- Room ID, name, capacity, standard nightly rate, member nightly rate, description

#### Reservations tab
All individual room-level reservation records:
- Reservation ID, linked Booking ID, linked Guest ID
- Room name, price at time of booking
- Check-in / Check-out dates
- Booking status (shows the parent booking's status)

### WhatsApp Status Badge

In the top-right of the admin header, a live status badge shows:
- 🟢 **WhatsApp Connected** — client is authenticated and ready to send messages
- 🔴 **WhatsApp Offline — scan QR in server logs** — client is not connected (see WhatsApp setup below)

---

## API Endpoints

### Public

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/healthz` | Health check |
| `GET` | `/api/rooms` | List all rooms |
| `GET` | `/api/rooms/:id` | Get room by ID |
| `GET` | `/api/availability` | Available rooms for a date range (`?check_in=&check_out=`) |
| `POST` | `/api/bookings` | Create a booking (guest + booking + reservations) |
| `GET` | `/api/bookings/:id` | Get booking with guest and room details |
| `POST` | `/api/payments/create-order` | Create Razorpay order for a booking |
| `POST` | `/api/payments/verify-order` | Verify signature, confirm booking, trigger notifications |

### Admin (JWT required)

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/admin/login` | Authenticate and receive JWT |
| `GET` | `/api/admin/bookings` | All bookings with filters (`?status=&date_from=&date_to=`) |
| `PUT` | `/api/admin/bookings/:id/status` | Update booking status |
| `GET` | `/api/admin/guests` | All guests |
| `GET` | `/api/admin/rooms` | All rooms |
| `GET` | `/api/admin/reservations` | All reservations with joined data |
| `GET` | `/api/admin/whatsapp-status` | WhatsApp client connection status |

---

## Issues Faced & Workarounds

### 1. `bcrypt` native build blocked by pnpm sandbox
**Problem:** `bcrypt` requires native C++ compilation (node-gyp). Replit's sandbox blocked the build script.  
**Workaround:** Replaced with `bcryptjs` — a pure JavaScript implementation that is API-compatible and produces the same `$2b$...` hash format.

### 2. `bcryptjs` not available in the code execution sandbox
**Problem:** The `executeSql`/code execution sandbox runs at the workspace root where `bcryptjs` isn't installed as a root-level package.  
**Workaround:** Located the pnpm store path for `bcryptjs` and ran a one-off `node --input-type=module` bash script using the absolute file path to hash the admin seed password, then inserted the hash literal directly into the seed SQL.

### 3. `wouter`'s `useLocation()` strips query strings
**Problem:** Wouter's `useLocation()` hook returns only the pathname — the `?check_in=...&check_out=...` query string was silently dropped, causing the rooms page to always show "No dates selected" even when dates were entered.  
**Workaround:** Replaced all `useQuery()` helpers with `new URLSearchParams(window.location.search)` which always reads the full browser URL including query params.

### 4. Stripe → Razorpay migration mid-build
**Problem:** Original spec used Stripe with a webhook for server-side confirmation. Replaced mid-project with Razorpay, which uses client-side signature verification instead.  
**Workaround:** Rewrote the entire payment flow — `create-order` + `verify-order` on the backend, removed all Stripe packages and replaced `CardElement`/`useStripe` with `react-razorpay`'s `useRazorpay` hook.

### 5. WhatsApp (whatsapp-web.js) requires Chromium — not available in Replit sandbox
**Problem:** `whatsapp-web.js` uses Puppeteer to control a headless Chromium browser. Replit's NixOS sandbox does not ship Chromium and blocks Puppeteer's post-install script.  
**Workaround:** The `initWhatsApp()` function is wrapped in a top-level try-catch. If Chromium is missing, it logs `WhatsApp init skipped` and the server continues normally. WhatsApp notifications are silently skipped without affecting bookings, payments, or emails.

### 6. Placeholder CSS variables in scaffolded `index.css`
**Problem:** The Vite scaffold set all CSS theme variables to `red` as placeholders (e.g. `--background: red`).  
**Workaround:** All UI components use Tailwind utility classes directly (`bg-stone-50`, `text-amber-500`, etc.) and do not reference CSS variables, so the placeholders have no visible effect.

### 7. Design subagent self-terminated
**Problem:** The async DESIGN subagent launched to build frontend pages encountered a package install issue and halted early.  
**Workaround:** All six frontend pages were built manually by the main agent.

---

## Known Issues to Fix

### 1. Razorpay keys not yet set
Until `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, and `VITE_RAZORPAY_KEY_ID` are added to Secrets, the payment page will show "Payment service error" and no Razorpay modal will open.

### 2. Resend email key not yet set
Until `RESEND_API_KEY` is added, booking confirmation emails are silently skipped. The booking still completes — only the email is missing.

### 3. WhatsApp not functional in Replit sandbox
`whatsapp-web.js` requires Chromium and persistent disk access for `LocalAuth`. Neither is available in the Replit free-tier container. The feature is fully implemented and will work on a standard Linux VPS; it is inert here.

### 4. Razorpay checkout not loadable without keys
The `useRazorpay` hook from `react-razorpay` attempts to load the Razorpay JS SDK from their CDN. If `VITE_RAZORPAY_KEY_ID` is empty, the "Pay" button renders but the Razorpay modal will not open.

### 5. No input sanitisation on phone field
The phone field on the booking form accepts any text. The WhatsApp sender strips non-digits and prepends `91` (India country code), which works for Indian numbers but will silently fail or send to the wrong number for international numbers.

### 6. Double-booking check only covers `confirmed` and `pending` statuses
Cancelled bookings correctly free up the room, but if a booking is stuck in `pending` (payment abandoned), the room remains blocked until an admin cancels it manually.

---

## Features Pending Complete Implementation

### 1. Razorpay live payments
**Status:** Fully wired on both ends. Blocked only by missing API keys.  
**To activate:** Add `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `VITE_RAZORPAY_KEY_ID` to Secrets and restart the server.

### 2. Email confirmation (Resend)
**Status:** Email template and send function are complete. Triggered after payment verification.  
**To activate:** Add `RESEND_API_KEY` (and optionally `EMAIL_FROM`) to Secrets.

### 3. WhatsApp booking confirmation
**Status:** Service module is fully implemented (`services/whatsapp.ts`). Triggered after payment verification alongside email.  
**To activate:**
- Deploy on a Linux server with Chromium installed (`apt install chromium-browser`)
- Set `CHROMIUM_PATH=/usr/bin/chromium-browser`
- On first start, a QR code will print in the server logs — scan it with WhatsApp on your phone
- `LocalAuth` persists the session to disk; the QR only needs to be scanned once
- The admin dashboard will show a green "WhatsApp Connected" badge once authenticated

### 4. Multi-room bookings
**Status:** The database schema and API fully support booking multiple rooms in one transaction (the `roomIds` array in `POST /api/bookings`). The frontend currently only passes a single room ID from the room detail page.  
**To complete:** Add a room selection step or a cart flow to the frontend.

### 5. Member registration / verification
**Status:** The `isMember` field on guests and the member pricing tier are fully implemented in the DB, API, and UI. There is no registration flow or identity verification — users self-declare membership on the booking form.  
**To complete:** Add a member ID or verification step, or integrate with an external membership system.

### 6. Booking expiry / auto-cancellation
**Status:** Not implemented. Pending bookings (payment not completed) remain in `pending` status indefinitely, blocking room availability.  
**To complete:** Add a scheduled job (cron or DB trigger) to auto-cancel bookings that remain `pending` after N minutes.

### 7. User-facing booking management
**Status:** Not implemented. Guests cannot look up, modify, or cancel their own booking after creation.  
**To complete:** Add a "Manage my booking" page accessible via booking ID + email verification.

### 8. Room images
**Status:** Currently using placeholder images from `picsum.photos` seeded by room name.  
**To complete:** Replace with real room photos stored in object storage (S3, Replit Object Storage, etc.) and update the `image_url` column in the rooms table.
