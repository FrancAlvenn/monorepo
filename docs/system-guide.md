# System User Guide

## 1. System Overview

The project is split into two components:

- `app-playground` (frontend): A React + Vite single-page application that provides authentication, IP geolocation lookup, a searchable history, and an interactive map.
- `monorepo` (backend): An Express API that handles authentication, CSRF protection, IP geolocation via IPinfo, and persistent history storage (Firestore or in-memory for development).

High-level architecture:

- Client (`app-playground`) calls API (`monorepo`) at `http://localhost:8000/api` by default.
- API normalizes IPinfo responses to a stable `geo` shape, enforces rate limits, CSRF, and returns history items.
- Storage layer uses Firestore in production; development defaults to in-memory storage if Firestore isn’t configured.

Folder roles:

- `app-playground/src/pages/Home.jsx`: Main UI for current IP, lookups, history, and the map.
- `monorepo/controllers/ipController.js`: IP endpoints (`/ip/current`, `/ip/lookup`, `/ip/history`, `/ip/history/delete`).
- `monorepo/services/firestore.js`: Storage abstraction with Firestore and in-memory modes.
- `monorepo/firebase/firestore.indexes.json`: Composite indexes for queries.

## 2. Prerequisites

Required software:

- Node.js 18+ (recommended 18.x or newer)
- npm 9+ (bundled with Node 18)

System dependencies:

- Internet access (IPinfo API calls)
- Optional: Firebase project for Firestore when not using in-memory dev mode

Environment variables:

| Component | Variable | Description | Default |
|---|---|---|---|
| Backend | `PORT` | Server port | `8000` |
| Backend | `NODE_ENV` | Runtime mode (`development`/`production`) | `development` |
| Backend | `CLIENT_ORIGIN` | Allowed frontend origin for CORS | `http://localhost:5173` |
| Backend | `JWT_ACCESS_SECRET` | Access token secret | required in prod |
| Backend | `JWT_REFRESH_SECRET` | Refresh token secret | required in prod |
| Backend | `JWT_ACCESS_TTL` | Access token TTL | `15m` |
| Backend | `JWT_REFRESH_TTL` | Refresh token TTL | `7d` |
| Backend | `LOGIN_MAX_ATTEMPTS` | Brute-force guard | `5` |
| Backend | `LOGIN_LOCKOUT_MINUTES` | Lockout window | `15` |
| Backend | `FIREBASE_PROJECT_ID` | Firestore project id | empty (uses in-memory if not set) |
| Backend | `FIREBASE_CLIENT_EMAIL` | Service account email | empty |
| Backend | `FIREBASE_PRIVATE_KEY` | Service account private key | empty |
| Backend | `FIREBASE_API_KEY` | Firebase web API key | empty |
| Backend | `FIREBASE_AUTH_DOMAIN` | Firebase auth domain | empty |
| Backend | `FIREBASE_APP_ID` | Firebase app id | empty |
| Backend | `IPINFO_TOKEN` | IPinfo API token for server lookups | empty (limited anonymous calls) |
| Frontend | `VITE_API_BASE_URL` | Backend base URL | `http://localhost:8000` |
| Frontend | `VITE_MAP_STYLE_URL` | MapLibre style URL | `https://demotiles.maplibre.org/style.json` |

Notes:

- Backend variables are declared in `monorepo/config/env.js` and read from `.env`.
- Frontend variables are declared via Vite and read from `import.meta.env`.

## 3. Setup: app-playground

Installation:

```bash
cd app-playground
npm install
```

Configuration:

- Create `app-playground/.env` (optional) to override defaults:

```bash
VITE_API_BASE_URL=http://localhost:8000
VITE_MAP_STYLE_URL=https://demotiles.maplibre.org/style.json
```

Initialization:

- Ensure the backend runs on `PORT=8000` or update `VITE_API_BASE_URL` accordingly.
- The app reads the access token from `localStorage` and retrieves CSRF tokens for protected requests automatically.

## 4. Setup: monorepo

Installation:

```bash
cd monorepo
npm install
```

Configuration:

- Create `monorepo/.env` with at least:

```bash
PORT=8000
NODE_ENV=development
CLIENT_ORIGIN=http://localhost:5173
JWT_ACCESS_SECRET=changeme-access
JWT_REFRESH_SECRET=changeme-refresh
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
IPINFO_TOKEN= # optional

# Firestore (optional for production use)
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_APP_ID=
```

Initialization:

- Development mode uses in-memory storage if Firestore is not configured.
- For production, set Firebase variables and deploy composite indexes from `firebase/firestore.indexes.json`.

## 5. Running the System

Development:

```bash
# Backend (Express + nodemon)
cd monorepo
nodemon start

# Frontend (Vite dev server)
cd app-playground
npm run dev
```

Production (local):

```bash
# Build frontend
cd app-playground
npm run build

# Serve backend
cd ../monorepo
npm start
```

Common options:

- Change backend port via `PORT` in `monorepo/.env`.
- Point frontend to backend via `VITE_API_BASE_URL`.

## 6. Usage Examples

Authentication (frontend):

- Sign Up and Sign In from the UI (`/signin`, `/signup`).
- Logout uses CSRF token behind the scenes.

IP Geolocation:

- Current IP: frontend calls `GET /api/ip/current` and displays normalized geo.
- Lookup: enter `8.8.8.8` or a domain and click `Search` to call `GET /api/ip/lookup?ip=...`.

History:

- History list loads from `GET /api/ip/history` and is merged with safe local cache.
- Select items and delete: sends `POST /api/ip/history/delete` with CSRF.

Map:

- The map centers on the current IP’s `geo.lat` and `geo.lon` with a marker.
- Basic navigation controls are included; style configured via `VITE_MAP_STYLE_URL`.

Integration:

- Ensure backend runs at `http://localhost:8000` and frontend points `VITE_API_BASE_URL` to it.
- CORS allows `CLIENT_ORIGIN=http://localhost:5173`.

## 7. Troubleshooting

Common issues:

- 403 CSRF errors: ensure cookies are enabled and requests include `credentials: 'include'`. Frontend already does this; verify the backend `csrf` route responds.
- 401/403 authentication: check `localStorage` for `access_token`; if missing, sign in again. Backend refresh endpoint `/api/refresh` issues new tokens when CSRF is provided.
- 500 history errors: confirm Firestore composite index is deployed and Firebase credentials are valid in production. In development, in-memory mode avoids Firestore.
- Map not loading: verify `geo.lat`/`geo.lon` exist (requires successful IPinfo response). Optionally set `VITE_MAP_STYLE_URL`.

Debugging tips:

- Frontend: run `npm run lint` and `npm run test` in `app-playground`.
- Backend: run `npm test` in `monorepo` (Jest + Supertest). Use console output for server logs.

Logs:

- Backend logs are printed to console by default. A `logs/` folder is ignored by Git and can be used if you add file-based logging.

## 8. Maintenance

Updates:

- Frontend: `cd app-playground && npm update`.
- Backend: `cd monorepo && npm update`.

Backups:

- Production storage: back up Firestore according to Firebase guidelines.
- Development: in-memory mode is ephemeral; no backup needed.

Performance:

- Use production builds (`npm run build`) for the frontend.
- Enable Firestore and deploy indexes for large history queries.
- Set appropriate rate limits and consider caching IPinfo responses if usage is high.

