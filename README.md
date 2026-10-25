# Evently: events ticket booking platform

A full-stack web app for discovering events and booking tickets. Guests can browse and search, customers can book tickets, save favorites and manage their bookings, and admins manage events, bookings and users.

**Stack:** React (Vite) · Node.js + Express · PostgreSQL · JWT auth · Zod validation

## Features

- Public catalog with search, filters (category, city, date range, price range), sorting and pagination; filters live in the URL
- Event details with ticket quantity picker and booking
- Registration, login, JWT auth, bcrypt password hashing, role-based access (customer, admin), blocked users
- Customer account: dashboard, my bookings (filters, sorting, pagination, cancellation), favorites, profile (name, password)
- Admin panel: dashboard metrics, event CRUD with image upload, event status management, bookings list, user management (role, block/unblock)
- Event statuses: draft → published → completed / cancelled (invalid transitions are rejected); cancelling an event cancels its bookings and releases tickets
- Ticket availability is protected with row locks in a transaction, so two people can't buy the last ticket
- Light and dark themes, responsive layout from 320px, mobile navigation, tables turn into cards on phones
- Consistent JSON errors, loading skeletons, empty states, confirmation dialogs
- OpenAPI/Swagger documentation at `/api/docs`

## Project structure

```
backend/    Express API (routes, services, middleware, schemas, db, scripts)
frontend/   React app (pages, components, context, api client)
```

## Getting started

Requirements: Node.js 18+ and a PostgreSQL database (a free [Neon](https://neon.com) project works well).

```bash
git clone https://github.com/Makostya19/events-ticket-booking.git
cd events-ticket-booking
```

### 1. Backend

```bash
cd backend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
```

Fill in `backend/.env` (see the table below), then create the tables and demo data:

```bash
npm run migrate           # creates the schema
npm run seed              # creates the admin account and 10 sample events
npm run dev               # http://localhost:5000
```

### 2. Frontend

```bash
cd frontend
npm install
cp .env.example .env      # on Windows: copy .env.example .env
npm run dev               # http://localhost:5173
```

## Environment variables

| File            | Variable         | Description                                                   |
| --------------- | ---------------- | ------------------------------------------------------------- |
| `backend/.env`  | `PORT`           | API port (default `5000`)                                     |
|                 | `CLIENT_URL`     | Frontend origin allowed by CORS, e.g. `http://localhost:5173` |
|                 | `JWT_SECRET`     | Long random string used to sign tokens                        |
|                 | `JWT_EXPIRES_IN` | Token lifetime, default `7d`                                  |
|                 | `DATABASE_URL`   | PostgreSQL connection string                                  |
|                 | `DB_SSL`         | `true` for hosted databases such as Neon, `false` for local   |
| `frontend/.env` | `VITE_API_URL`   | API base URL, e.g. `http://localhost:5000`                    |

Generate a secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Demo credentials

| Role     | Email                   | Password               |
| -------- | ----------------------- | ---------------------- |
| Admin    | `admin@example.com`     | `Admin12345`           |
| Customer | register on `/register` | any (min 8 characters) |

The admin account is created by `npm run seed`. Change this password before deploying anywhere public.

## API documentation

Swagger UI: `http://localhost:5000/api/docs` (raw spec at `/api/docs.json`).
Log in with `POST /api/auth/login`, copy the token, click **Authorize** and paste it.

Main route groups: `/api/auth`, `/api/users`, `/api/events`, `/api/bookings`, `/api/favorites`, `/api/dashboard`, `/api/admin/events`, `/api/admin/bookings`, `/api/admin/users`, `/api/admin/dashboard`.

## Business rules

- Customers can book only published events that haven't started and have enough tickets
- Customers can cancel their own confirmed bookings before the event starts; tickets return to availability
- Admins can't book tickets, and can't block or demote themselves
- Event status transitions: draft → published, draft → cancelled, published → cancelled, published → completed. Cancelled and completed events are locked
- An event with active bookings can't be deleted: cancel it instead
- Images: jpg, png or webp up to 2 MB, stored locally in `backend/uploads`
- Booking is race-safe: the event row is locked inside a transaction, verified by `npm run test:race`

## Scripts

| Where    | Command             | What it does                                                                     |
| -------- | ------------------- | -------------------------------------------------------------------------------- |
| backend  | `npm run dev`       | Start the API with auto-reload                                                   |
| backend  | `npm start`         | Start the API                                                                    |
| backend  | `npm run migrate`   | Apply `src/db/schema.sql`                                                        |
| backend  | `npm run seed`      | Create the admin and sample events (skips events if any exist)                   |
| backend  | `npm run test:race` | Concurrency test: 12 simultaneous bookings for 5 tickets, exactly 5 must succeed |
| frontend | `npm run dev`       | Start the Vite dev server                                                        |
| frontend | `npm run build`     | Production build                                                                 |
| frontend | `npm run lint`      | Run ESLint                                                                       |

## Testing

The API must be running (`npm run dev` in `backend`). The race test uses the seeded admin and a customer account, and removes the temporary event it creates.

```bash
cd backend
npm run test:race
```

Expected output ends with three `PASS` lines. If your customer account differs from the default, set the credentials first:

| Variable                               | Default                            |
| -------------------------------------- | ---------------------------------- |
| `API_URL`                              | `http://localhost:5000`            |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`       | `admin@example.com` / `Admin12345` |
| `CUSTOMER_EMAIL` / `CUSTOMER_PASSWORD` | `test@example.com` / `password123` |

Register the customer on `/register` first if it doesn't exist yet.

## Notes

- Uploaded images are stored on the server's disk. Many hosts wipe the disk on restart, so use cloud storage (S3, Cloudinary) for production.
- `.env` files are git-ignored. Never commit secrets.
