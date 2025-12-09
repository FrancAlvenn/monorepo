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
- CORS allowed for client origin in `.env`.
- Body parsing enabled via `body-parser`.
 - CSRF protection via cookie-based token on `/api/login` and `/api/refresh`.

### Authentication
- `POST /api/login` body `{ email, password }` with header `x-xsrf-token`
  - sets HTTP-only `refresh_token` cookie
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
