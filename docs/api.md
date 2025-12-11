# Auth-enabled Express Template

## Description
- Express template with authentication enabled
- JWT-based session management
- CSRF protection via cookie-based token

## Storage (Firebase)
- Firestore for user data
- HTTP-only cookies for refresh tokens
- Im-memory storage when Firebase is not available

## Endpoints
- `GET /health` → `{ status: 'ok' }`
- `GET /api/ping` → `{ message: 'pong' }`
- `GET /api/csrf` → `{ csrfToken }` and sets `XSRF-TOKEN` cookie

- `GET /api/ip/current` → `200 { ip, geo }` or `502 { message }`
- `POST /api/ip/lookup` body `{ ip }` with header `x-xsrf-token` → `200 { ip, geo }` or `400 { message }` or `502 { message }`
- `GET /api/ip/lookup?ip=1.2.3.4` (deprecated; read-only) → `200 { ip, geo }` or `400 { message }` or `502 { message }`
- `GET /api/ip/history?limit=50` → `200 { items }` or `400 { message }` or `500 { message }`
- `POST /api/ip/history/delete` body `{ ids: string[] }` with header `x-xsrf-token` → `200 { deleted, items }` or `400 { message }` or `500 { message }`

Backend integrates with `https://ipinfo.io/geo` (and `/{ip}/geo`) and returns a normalized `geo` shape compatible with the previous API.

Notes:
- History retrieval requires a composite Firestore index on `ip_search_history` with fields (`userId` ASC, `timestamp` DESC). See `firebase/firestore.indexes.json`.
- Deletion operation is executed atomically within a Firestore transaction and only removes documents that belong to the authenticated user.

## Setup
1. Copy `.env.template` to `.env` and set `PORT`, `CLIENT_ORIGIN`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Production start: `npm start`

## Structure
- `app.js` — Express app and middleware
- `server.js` — Server entry
- `routes/` — Basic route handlers + auth routes
- `middlewares/errorHandler.js` — Error and 404 handling
- `config/env.js` — Environment variables
 - `config/db.js` — Database connection
 - `models/` — `User`, `RefreshToken`

## Notes
- CORS configured to allow the authorized frontend origin in `.env` (`CLIENT_ORIGIN`), with credentials enabled and headers whitelisted (`Content-Type`, `Authorization`, `x-xsrf-token`, `x-csrf-token`, `x-refresh-token`).
- Body parsing enabled via `body-parser`.
- CSRF protection via cookie-based tokens:
  - Server sets secret `_csrf` cookie (`HttpOnly`, `SameSite=None`, `Secure` in production).
  - Server exposes `GET /api/csrf` which returns `{ csrfToken }` and sets `XSRF-TOKEN` cookie (`SameSite=None`, `Secure` in production).
  - All state-changing endpoints require header `x-xsrf-token` with the value from `/api/csrf`.
  - CSRF failures return `403 { message: 'Invalid CSRF token' }`.

### Authentication
- `POST /api/login` body `{ email, password }` with header `x-xsrf-token`
  - sets HTTP-only `refresh_token` cookie (`SameSite=None`, `Secure` in production)
  - returns `{ accessToken, expiresAt, user }`
- `POST /api/refresh` with header `x-xsrf-token` and refresh token from cookie
  - rotates refresh token (cookie) and returns `{ accessToken, expiresAt, user }`
- `POST /api/signup` body `{ email, password, displayName? }` with header `x-xsrf-token`
  - returns `{ user }`
- `GET /api/me` with header `Authorization: Bearer <accessToken>`
  - returns `{ user }` or `401`
- `POST /api/logout` with header `x-xsrf-token`
  - clears refresh cookie


Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
