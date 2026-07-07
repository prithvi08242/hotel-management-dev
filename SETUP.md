# Wayfarer — Complete Application (hms-dev contents)

Copy the contents of this zip directly into your `hms-dev` repo root,
overwriting existing files. Structure matches exactly:

```
hms-dev/
├── .github/workflows/ci.yml
├── backend/
│   ├── app/ (database.py, models.py, auth.py, main.py)
│   ├── alembic/ (env.py, script.py.mako, versions/0001-0003)
│   ├── alembic.ini
│   ├── Dockerfile
│   ├── requirements.txt
│   └── tests/api/test_app.py
└── frontend/
    ├── src/ (App.jsx, api.js, index.css, main.jsx, context/, components/, pages/)
    ├── index.html
    ├── vite.config.js
    ├── eslint.config.js
    ├── Dockerfile
    └── package.json
```

`docker-compose.yml` at the top level of this zip belongs in your **hms-test**
repo instead (per the two-repo split), not hms-dev.

## Local setup

```bash
# Backend
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt

# Start Postgres (adjust if you already have one running)
docker run -d --name wayfarer-pg -e POSTGRES_USER=wayfarer \
  -e POSTGRES_PASSWORD=wayfarer_dev_pw -e POSTGRES_DB=wayfarer \
  -p 5432:5432 postgres:16

alembic upgrade head
uvicorn app.main:app --reload --port 8000

# Frontend (separate terminal)
cd frontend
yarn install
yarn dev
```

Open the URL Vite prints (usually http://localhost:5173).

## Seeded accounts
| Email | Password | Role |
|---|---|---|
| guest@w.com | guest | guest |
| admin@w.com | admin | admin |

## Pages
- `/login`, `/signup` — auth
- `/rooms` — search + book
- `/book/:roomId` — booking form
- `/my-bookings` — view/cancel bookings
- `/admin` — view all bookings, add rooms (admin only)
