# Wayfarer — Setup & Pipeline Guide

*Living document — sections added as each part of the pipeline is completed.*

---

## Run locally

**One-time: build images**
```bash
cd backend
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

Open `http://localhost:5173` in your browser.

**Test accounts:** `guest@w.com` / `guest` · `admin@w.com` / `admin`

---

## Linting

**Backend:**
```bash
cd backend
source .venv/bin/activate
```
**Code Check:**
```bash
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

## Bring it down if you want

```bash
docker compose down
```

Add `-v` to also wipe the Postgres data volume:
```bash
docker compose down -v
```

---

## Push your changes

```bash
cd ..
git add .
git commit -m "your message"
git push
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

**Action versions** (bumped for Node 24 support, no deprecation warnings):
`aws-actions/configure-aws-credentials@v6.1.0`, `docker/build-push-action@v7`

**Status:** full pipeline (`lint → backend-test + frontend-test → build-and-push`)
confirmed passing end to end against this account.

**Naming convention:** everything AWS/K8s-side uses the `hms-` prefix —
`hms-backend`/`hms-frontend` (ECR), `hms-role` (IAM), `hms-cluster` (EKS),
`hms-nodes` (nodegroup).

---

## EKS cluster setup (what actually worked)

```bash
# 1. Create the cluster (correct instance type + nodes together, one command)
eksctl create cluster \
  --name hms-cluster \
  --region us-east-1 \
  --nodegroup-name hms-nodes \
  --node-type t3.small \
  --nodes 2 \
  --nodes-min 1 \
  --nodes-max 3 \
  --managed

# 2. Immediately confirm all 3 core addons exist before doing anything else
aws eks list-addons --cluster-name hms-cluster
# must show: coredns, kube-proxy, vpc-cni
# if vpc-cni is missing, create it manually before proceeding:
#   aws eks create-addon --cluster-name hms-cluster --addon-name vpc-cni

# 3. Confirm nodes are Ready
aws eks update-kubeconfig --name hms-cluster --region us-east-1
kubectl get nodes
```

**Key things that matter:**
- Use a **Free Tier-eligible instance type** (`t3.small` — check with
  `aws ec2 describe-instance-types --filters "Name=free-tier-eligible,Values=true"`).
  Non-eligible types on a new AWS account fail silently for a long time
  before finally erroring.
- `eksctl`'s own "waiting for CloudFormation stack" messages can time out
  even when the resource is actually still creating successfully in the
  background — always verify directly with `aws eks describe-nodegroup`
  rather than trusting eksctl's client-side timeout.
- Confirm `vpc-cni` specifically exists right after cluster creation —
  it's what allows nodes to become `Ready` at all.

## Apply the K8s manifests

```bash
kubectl apply -f k8s/namespace.yml
kubectl apply -f k8s/postgres.yml
kubectl apply -f k8s/backend.yml
kubectl apply -f k8s/frontend.yml

kubectl get pods -n staging
```

## Roll out a new image after CI builds one

```bash
aws ecr describe-images --repository-name hms-backend --query "sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]" --output text
aws ecr describe-images --repository-name hms-frontend --query "sort_by(imageDetails,& imagePushedAt)[-1].imageTags[0]" --output text

# Replace <sha> with above output
kubectl set image deployment/backend backend=424503481180.dkr.ecr.us-east-1.amazonaws.com/hms-backend:<sha> -n staging
kubectl set image deployment/frontend frontend=424503481180.dkr.ecr.us-east-1.amazonaws.com/hms-frontend:<sha> -n staging

kubectl get pods -n staging

kubectl get svc frontend -n staging   # EXTERNAL-IP is the live URL Access the application
```

## Grant CI role access inside the cluster (one-time, per cluster)

IAM permissions and EKS cluster access are separate systems — `hms-role`
can push to ECR, but has no permission to run `kubectl` against the
cluster until explicitly granted:

```bash
aws eks create-access-entry \
  --cluster-name hms-cluster \
  --principal-arn arn:aws:iam::424503481180:role/hms-role

aws eks associate-access-policy \
  --cluster-name hms-cluster \
  --principal-arn arn:aws:iam::424503481180:role/hms-role \
  --policy-arn arn:aws:eks::aws:cluster-access-policy/AmazonEKSAdminPolicy \
  --access-scope type=cluster
```

Needed again any time the cluster is recreated (access entries don't
survive a cluster delete).

## `deploy-staging` CI job (automates everything above)

Add to `ci.yml`, after `build-and-push`. Requires `build-and-push` to
expose its ECR registry URL as a job output first:

```yaml
build-and-push:
  ...
  outputs:
    registry: ${{ steps.ecr-login.outputs.registry }}
```

```yaml
deploy-staging:
  needs: build-and-push
  runs-on: ubuntu-latest
  permissions:
    id-token: write
    contents: read
  steps:
    - uses: actions/checkout@v6

    - name: Configure AWS credentials
      uses: aws-actions/configure-aws-credentials@v6.1.0
      with:
        role-to-assume: ${{ secrets.AWS_ROLE_ARN }}
        aws-region: ${{ vars.AWS_REGION }}

    - name: Update kubeconfig
      run: aws eks update-kubeconfig --name hms-cluster --region ${{ vars.AWS_REGION }}

    - name: Apply manifests (structure/drift safety)
      run: |
        kubectl apply -f k8s/namespace.yml
        kubectl apply -f k8s/postgres.yml
        kubectl apply -f k8s/backend.yml
        kubectl apply -f k8s/frontend.yml

    - name: Roll out new images
      run: |
        kubectl set image deployment/backend \
          backend=${{ needs.build-and-push.outputs.registry }}/hms-backend:${{ github.event.pull_request.head.sha }} \
          -n staging
        kubectl set image deployment/frontend \
          frontend=${{ needs.build-and-push.outputs.registry }}/hms-frontend:${{ github.event.pull_request.head.sha }} \
          -n staging

    - name: Wait for rollout
      run: |
        kubectl rollout status deployment/backend -n staging --timeout=180s
        kubectl rollout status deployment/frontend -n staging --timeout=180s

    - name: Rollback on failed rollout
      if: failure()
      run: |
        kubectl rollout undo deployment/backend -n staging
        kubectl rollout undo deployment/frontend -n staging

    - name: Print staging URL
      run: kubectl get svc frontend -n staging -o jsonpath='{.status.loadBalancer.ingress[0].hostname}'
```

After this, every merged PR automatically builds, pushes, and deploys to
staging — no manual `kubectl set image` ever needed again.

---

*Next up: E2E tests wired into CI against the real staging URL.*

---

## Tear down when done (avoid ongoing cost)

```bash
eksctl delete cluster --region=us-east-1 --name=hms-cluster
```

Then confirm nothing costly is left behind — NAT gateways and Elastic IPs
sometimes survive a cluster delete if there was an earlier partial/failed
attempt:
```bash
aws ec2 describe-nat-gateways --query "NatGateways[?State!='deleted'].[NatGatewayId,State]" --output table
aws ec2 describe-addresses --query "Addresses[].[PublicIp,AssociationId]" --output table
```
Delete anything that shows up:
```bash
aws ec2 delete-nat-gateway --nat-gateway-id <id>
aws ec2 release-address --allocation-id <id>
```

**Optional — delete ECR repos/images too** (not required for cost, since
ECR storage is essentially free at this scale, but included for a fully
clean slate). CI's "Ensure ECR repos exist" step recreates them
automatically on the next run, so this is always safe to do:
```bash
aws ecr delete-repository --repository-name hms-backend --force
aws ecr delete-repository --repository-name hms-frontend --force
```

Confirm cost:
```bash
aws ce get-cost-and-usage --time-period Start=$(date -v1d +%Y-%m-%d),End=$(date +%Y-%m-%d) --granularity MONTHLY --metrics "UnblendedCost"
```
