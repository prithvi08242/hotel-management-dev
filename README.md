# Wayfarer — Hotel Management System

A portfolio project pairing a real hotel booking application with a full
SDET/DevOps pipeline, built incrementally across two repos.

---

## 1. What's built

| Feature | Status |
|---|---|
| Login | ✅ |
| Signup | ✅ |
| Room search & listing | ✅ |
| Booking creation / cancellation | ✅ |
| Admin dashboard | ✅ |
| EKS cluster + staging deploy | ⬜ |
| E2E wired into CI against real staging URL | ⬜ |
| Go/no-go gate | ⬜ |
| Production deploy (HA, self-healing) | ⬜ |
| Custom domain | ⬜ |

---

## 2. Stack

- **Backend:** FastAPI, SQLAlchemy, Alembic migrations, PostgreSQL
- **Frontend:** React + Vite + React Router
- **Auth:** JWT, sent as `Authorization: Bearer <token>`
- **CI/CD:** GitHub Actions, AWS ECR (via OIDC, no stored keys)

---

## 3. Backend reference

Schema is migration-managed (`backend/alembic/versions/` — three
migrations: users, rooms, bookings).

| Endpoint | Auth | Notes |
|---|---|---|
| `GET /api/health` | none | health check |
| `POST /api/signup` | none | creates a guest account, returns JWT |
| `POST /api/login` | none | returns JWT + user info |
| `GET /api/rooms` | none | filter by type, price, occupancy, dates |
| `POST /api/bookings` | required | rejects overlapping dates |
| `GET /api/bookings/me` | required | current user's bookings |
| `DELETE /api/bookings/{id}` | required (owner) | cancels a booking |
| `GET /api/admin/bookings` | required (admin) | all bookings |
| `POST /api/admin/rooms` | required (admin) | add a room |

---

## 4. Frontend reference

Ticket-stub styled room cards, persistent nav bar. Every interactive
element carries a `data-testid` for E2E automation.

| Route | Page | Protected |
|---|---|---|
| `/login` | Sign in | no |
| `/signup` | Create account | no |
| `/rooms` | Search & browse rooms | no |
| `/book/:roomId` | Confirm a booking | yes |
| `/my-bookings` | View / cancel bookings | yes |
| `/admin` | Stats, add rooms, view all bookings | yes (admin) |

---

## 5. Seeded test accounts

| Email | Password | Role |
|---|---|---|
| `guest@w.com` | `guest` | guest |
| `admin@w.com` | `admin` | admin |

---

## 6. Local setup

### Image names (consistent everywhere)
- `hms-back-img` — backend
- `hms-front-img` — frontend

*(ECR uses different names — `hms-backend` / `hms-frontend` — that's fine;
`docker-compose.yml` never talks to ECR directly, only CI's
`build-and-push` job does.)*

### One-time: build images
```bash
cd backend
docker build -t hms-back-img .

cd ../frontend
docker build -t hms-front-img .
```

### Run everything — one command
```bash
docker compose up
```
This starts Postgres, runs `alembic upgrade head` automatically inside the
backend container before it starts, and starts the frontend. No manual
migration step needed.

Open `http://localhost:5173` (or whichever port Vite's log shows — always
use the `Local:` URL, never the `Network:` one from your browser).

### Verify end to end
1. Sign up, or log in with a seeded account
2. Search rooms, book one
3. View it under **My bookings**, cancel it
4. Log in as admin, confirm it shows in the **Admin dashboard**

### Shutting down
```bash
docker compose down          # stop containers
docker compose down -v       # also wipe Postgres data
```

### Genuine clean slate (only if something's broken)
```bash
docker compose down -v
lsof -ti:8000 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null
lsof -ti:5174 | xargs kill -9 2>/dev/null
lsof -ti:5432 | xargs kill -9 2>/dev/null

cd backend && docker build --no-cache -t hms-back-img . && cd ..
cd frontend && docker build --no-cache -t hms-front-img . && cd ..

docker compose up
```

---

## 7. CI pipeline (`.github/workflows/ci.yml`)

Triggered on `pull_request` → `main` — this is the go/no-go gate before merge:

```
lint (black, flake8, eslint)
  ↓
backend-test (Postgres service + alembic upgrade + pytest)
frontend-test (Jest)
  ↓
build-and-push (assumes AWS role via OIDC, pushes to ECR)
```

All four jobs must pass before merge is allowed.

---

## 8. AWS resources

- **ECR repos:** `hms-backend`, `hms-frontend`
  (`442729101598.dkr.ecr.us-east-1.amazonaws.com`)
- **IAM OIDC provider:** trusts `token.actions.githubusercontent.com`,
  audience `sts.amazonaws.com`
- **IAM role:** `hms-role`
  (`arn:aws:iam::442729101598:role/hms-role`), scoped to
  `prithvi08242/hotel-management-dev`, permission
  `AmazonEC2ContainerRegistryPowerUser`
- **GitHub secrets/vars set in this repo:** `AWS_ROLE_ARN` (secret),
  `AWS_REGION` (variable)

No long-lived AWS keys are stored anywhere — GitHub Actions assumes the
role at runtime via OIDC, per run.

---

## 9. Repo split

| Repo | Owns |
|---|---|
| `hms-dev` (this repo) | Application code, Dockerfiles, CI pipeline |
| `hms-test` | Playwright E2E specs, live pipeline dashboard |

`docker-compose.yml` is intentionally kept in both repos — update both if
it changes.