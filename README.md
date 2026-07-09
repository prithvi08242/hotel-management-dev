# Wayfarer — Setup & Pipeline Guide

*Living document — sections added as each part of the pipeline is completed.*

---

## Run locally

**One-time: build images**
```bash
cd ../backend
docker build -t hms-back-img .

cd ../frontend
docker build -t hms-front-img .
```

**Start everything**

`docker-compose.yml` lives at the repo root:
```bash
cd ..
docker compose up
```
Starts Postgres, runs migrations automatically, starts backend + frontend.

Open `http://localhost:5173` (use the `Local:` URL Vite prints, not `Network:`).

**Test accounts:** `guest@w.com` / `guest` · `admin@w.com` / `admin`

---

## Bring it down

```bash
docker compose down
```

Add `-v` to also wipe the Postgres data volume:
```bash
docker compose down -v
```

---

## Linting

**Backend:**
```bash
cd ../backend
source .venv/bin/activate
black --check .
flake8 .
```
If either command says "command not found," dependencies aren't installed
in this venv yet — run `pip install -r requirements.txt` and retry.

`source .venv/bin/activate` only applies to the current terminal session —
every time you open a new terminal/tab, run it again before using
`black`/`flake8`/`pytest`/`uvicorn`.

Uses `backend/setup.cfg` (88-char line length, excludes `.venv`).

**Frontend:**
```bash
cd ../frontend
yarn eslint src --max-warnings=0
```

---

## Testing

**Backend** (app must be running):
```bash
cd ../backend
source .venv/bin/activate
pytest tests/api -q
```
Remember: `source .venv/bin/activate` is per-terminal-session — re-run it
if you opened a new terminal since last activating.

**Frontend:**
```bash
cd ../frontend
yarn test --watchAll=false
```

---

## CI pipeline overview (`.github/workflows/ci.yml`)

Triggered on every PR targeting `main`. Four jobs, in order:

```
lint → backend-test + frontend-test (parallel) → build-and-push
```

All four must pass before merge.

| Job | Purpose |
|---|---|
| `lint` | Runs `black`, `flake8` (backend) and `eslint` (frontend). Nothing else starts until this passes. |
| `backend-test` | Spins up a real Postgres container, runs migrations, starts the app, runs `pytest` against real endpoints. |
| `frontend-test` | Runs Jest unit tests (component-level, mocked API — no backend needed). |
| `build-and-push` | Assumes AWS role via OIDC (no stored keys), creates ECR repos if missing, builds both Docker images, pushes them tagged with the exact commit SHA. |

**Note:** while testing AWS setup, `lint`/`backend-test`/`frontend-test` were
temporarily disabled (`if: false`) and `build-and-push`'s `needs:` was
removed, so it could run standalone. Revert both once AWS is confirmed
working — no `if: false` anywhere, `needs: [backend-test, frontend-test]`
restored on `build-and-push` — so the real merge gate is enforced again.

---

## AWS bootstrap (one-time, outside CI)

**Prerequisite:** `aws configure` must already be set up with valid
credentials (Access Key ID + Secret Access Key from an IAM user with
sufficient permissions, e.g. AdministratorAccess) before running any of
the commands below — the AWS CLI has nothing to authenticate with otherwise.
```bash
aws configure
```
Confirm it worked:
```bash
aws sts get-caller-identity
```

**Also required: GitHub CLI (`gh`)**, for setting secrets/variables via
CLI instead of the console UI.
```bash
brew install gh
gh auth login
```
Follow the prompts: choose **GitHub.com** → **HTTPS** → **Login with a web
browser**. It shows a one-time code (e.g. `992B-9442`) and says "Press
Enter to open browser" — press **Enter** (don't Ctrl+C). A browser tab
opens to `github.com/login/device` — type that exact code there and
authorize. Terminal confirms success once approved in the browser.

Run once, before `build-and-push` can work. CI cannot do this itself — it
needs the role to already exist to authenticate at all.

```bash
# 1. OIDC provider (trusts GitHub Actions)
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1

# 2. Trust policy file, scoped to this repo
cat > trust-policy.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:prithvi08242/hotel-management-dev:*"
        }
      }
    }
  ]
}
EOF

# 3. Create the role
aws iam create-role \
  --role-name hms-role \
  --assume-role-policy-document file://trust-policy.json

# 4. Attach ECR permission (FullAccess, not PowerUser — CI needs to
# create repos on a fresh account, and PowerUser deliberately excludes
# CreateRepository)
aws iam attach-role-policy \
  --role-name hms-role \
  --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryFullAccess

# 5. Get the role ARN
aws iam get-role --role-name hms-role --query "Role.Arn" --output text

# 6. Set GitHub secrets (paste the ARN from step 5)
gh secret set AWS_ROLE_ARN --body "arn:aws:iam::<ACCOUNT_ID>:role/hms-role"
gh variable set AWS_REGION --body "us-east-1"
```

Replace `<ACCOUNT_ID>` with your actual AWS account ID (`aws sts get-caller-identity`).

**ECR repos** (`hms-backend`, `hms-frontend`) are created idempotently
*inside* CI's `build-and-push` job (`Ensure ECR repos exist` step) — no
manual `aws ecr create-repository` needed, even on a brand-new AWS account.
This requires the role to have `AmazonEC2ContainerRegistryFullAccess`
(see step 4 above), not just `PowerUser`.

**Current account:** `424503481180`
**Current role ARN:** `arn:aws:iam::424503481180:role/hms-role`

**Status:** full pipeline (`lint → backend-test + frontend-test → build-and-push`)
confirmed passing end to end against this account.

---

*Next up: deploy-staging (EKS) — in progress.*