# Wayfarer — Login page

**Status:** Step 1 of the dev repo roadmap. This is the *only* page in this
increment — no DB, no Docker, no CI. Those belong in the separate SDET repo
and get added incrementally, page by page.

## What's here

- **Backend** (`backend/`): FastAPI app with two endpoints:
  - `GET /api/health` — plain health check
  - `POST /api/login` — accepts `{ email, password }`, returns a JWT + user
    info on success, `401` on failure
  - Users are stored **in memory** (`backend/app/auth.py`) — no database yet.
    This is deliberate: auth logic gets proven correct first, persistence
    gets added later when a feature (bookings) actually needs it.

- **Frontend** (`frontend/`): One page, `src/pages/LoginPage.jsx` — an email
  + password form with three visible states (idle/error, loading, success),
  each carrying a `data-testid` for E2E automation:

  | Element | `data-testid` |
  |---|---|
  | Whole page | `login-page` |
  | Form | `login-form` |
  | Email field | `email-input` |
  | Password field | `password-input` |
  | Submit button | `login-button` |
  | Error message | `login-error` |
  | Success view | `login-success` |
  | Signed-in role | `logged-in-role` |

## Seeded test accounts

| Email | Password | Role |
|---|---|---|
| `guest@wayfarer.dev` | `Wayfarer@2026` | guest |
| `admin@wayfarer.dev` | `AdminPass@2026` | admin |

## Running it locally

Backend:
```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
yarn install
yarn dev
```

Open http://localhost:5173 — try both seeded accounts, and try a wrong
password to see the error state.

## Not in scope for this page

Docker, docker-compose, GitHub Actions, and Playwright tests are being built
separately in the SDET repo, against this code, as its own learning track.
