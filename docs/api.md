# Basic Express Template

## Endpoints
- `GET /health` → `{ status: 'ok' }`
- `GET /api/ping` → `{ message: 'pong' }`

## Setup
1. Copy `.env.template` to `.env` and adjust `PORT` and `CLIENT_ORIGIN`.
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Production start: `npm start`

## Structure
- `app.js` — Express app and middleware
- `server.js` — Server entry
- `routes/` — Basic route handlers
- `middlewares/errorHandler.js` — Error and 404 handling
- `config/env.js` — Environment variables

## Notes
- CORS allowed for client origin in `.env`.
- Body parsing enabled via `body-parser`.
