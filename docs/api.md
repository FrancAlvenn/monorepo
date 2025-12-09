# Auth-enabled Express Template

## Endpoints
- `GET /health` → `{ status: 'ok' }`
- `GET /api/ping` → `{ message: 'pong' }`
- `GET /api/csrf` → `{ csrfToken }` and sets `XSRF-TOKEN` cookie

## Setup
1. Copy `.env.template` to `.env` and set `PORT`, `CLIENT_ORIGIN`, `MONGO_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`.
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
  - returns `{ accessToken, refreshToken, expiresAt, user }`
- `POST /api/refresh` body `{ refreshToken }` with header `x-xsrf-token`
  - returns rotated `{ accessToken, refreshToken, expiresAt, user }`

Password must be at least 8 characters and contain uppercase, lowercase, number, and special character.
