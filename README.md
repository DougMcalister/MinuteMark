# Chrona

Chrona is a private, small-team time tracker inspired by the useful core of Toggl: a one-click timer, project attribution, recent entries, weekly totals, and lightweight reporting. It is intentionally a focused project tool rather than a public SaaS product.

## Beta scope

- Account registration and token-based sign-in.
- Private workspaces with owner, admin, and member roles.
- Owners/admins can add an already-registered teammate by email.
- Shared workspace projects and time entries; data is isolated between workspaces.
- One running timer per person per workspace; starting another stops the previous timer.
- Manual deletion, weekly project split, responsive UI, Django admin.
- PostgreSQL production database, Docker images, health endpoint, CI, and Azure Bicep infrastructure.

This beta does not yet include email delivery, password reset, offline tracking, idle detection, exports, billing, or SSO. Adding people by email is deliberately a two-step private workflow: the teammate registers, then an owner adds them from **Team**.

## Architecture

```text
Browser -> Next.js Container App -> DRF Container App -> Azure PostgreSQL
                                      | health/admin
                                      +-> Log Analytics
```

The browser talks directly to the authenticated API. Every business query is scoped by membership in the `X-Workspace-ID` header. The first available workspace is selected automatically. Tokens are stored in browser local storage for beta simplicity; before exposing this beyond a trusted team, move authentication to secure, HTTP-only cookies (or Microsoft Entra ID).

## Local setup

Requirements: Docker Desktop with Compose. Copy `.env.example` to `.env`, change the local secrets, then run:

```bash
docker compose up --build
```

Open `http://localhost:3000`. The API is at `http://localhost:8000/api/`, health at `http://localhost:8000/health/`, and admin at `http://localhost:8000/admin/`.

Create an admin when needed:

```bash
docker compose exec api python manage.py createsuperuser
```

### Run without Docker

Backend (SQLite is used automatically when `DATABASE_URL` is absent):

```bash
cd backend
python -m venv .venv
.venv/Scripts/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## API essentials

Authentication uses `Authorization: Token <token>`. Workspace endpoints need only the token; project and entry endpoints also accept `X-Workspace-ID: <id>` and default to the user's first membership if omitted.

| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/api/auth/register/` | Create account and private workspace |
| POST | `/api/auth/login/` | Obtain API token |
| GET/POST | `/api/workspaces/` | List/create workspaces |
| POST | `/api/workspaces/{id}/invite/` | Add registered teammate (owner/admin) |
| GET/POST | `/api/projects/` | List/create workspace projects |
| GET/POST | `/api/entries/` | List/start time entries |
| POST | `/api/entries/{id}/stop/` | Stop a timer |
| GET | `/api/entries/running/` | Current timer |
| GET | `/api/entries/summary/` | Current-week totals |

## Tests and quality gates

```bash
cd backend && pytest
cd frontend && npm test
cd frontend && npm run build
```

Backend tests cover timer rollover, duration calculation, cross-workspace project rejection, and non-member isolation. Frontend tests cover duration formatting and timer submission. GitHub Actions runs those tests, a production Django configuration check, and the Next.js build on every push and pull request.

## Azure deployment plan

The included `infra/main.bicep` provisions an Azure Container Apps environment, two externally addressable Container Apps, Log Analytics, and Azure Database for PostgreSQL Flexible Server with 14-day backups. For a tiny private team, the default Burstable database and 0.5-vCPU containers are a sensible starting point.

### 1. Prepare Azure

Install Docker and Azure CLI, sign in, and choose a subscription. Pick globally unique names and keep secrets out of source control.

```bash
az login
az account set --subscription "<subscription-id>"
az group create --name chrona-prod-rg --location australiaeast
az acr create --resource-group chrona-prod-rg --name <uniqueRegistry> --sku Basic
az acr login --name <uniqueRegistry>
```

### 2. Build immutable images

`NEXT_PUBLIC_API_URL` is embedded in the frontend bundle at build time. The stable approach is to deploy infrastructure once with a temporary web image, note the API hostname, then rebuild the web image with that URL. Alternatively add a custom API domain first.

```bash
docker build -t <registry>.azurecr.io/chrona-api:1.0.0 backend
docker build --build-arg NEXT_PUBLIC_API_URL=https://api.example.com/api -t <registry>.azurecr.io/chrona-web:1.0.0 frontend
docker push <registry>.azurecr.io/chrona-api:1.0.0
docker push <registry>.azurecr.io/chrona-web:1.0.0
```

### 3. Provision resources

Use a randomly generated PostgreSQL password. Bicep marks it secure, but prefer CI secret injection or Azure Key Vault for an established environment.

```bash
az deployment group create \
  --resource-group chrona-prod-rg \
  --template-file infra/main.bicep \
  --parameters prefix=chrona-prod \
               postgresAdminPassword='<strong-generated-password>' \
               registryServer='<registry>.azurecr.io' \
               registryUsername='<registry-user>' \
               registryPassword='<registry-password>' \
               apiImage='<registry>.azurecr.io/chrona-api:1.0.0' \
               webImage='<registry>.azurecr.io/chrona-web:1.0.0'
```

The template configures the supplied registry credentials on each Container App. For a more mature environment, replace those credentials with user-assigned managed identities and `AcrPull` role assignments. Restrict PostgreSQL to private networking once the proof deployment is validated; `AllowAzureServices` is convenient for beta but broader than ideal.

### 4. Validate and release

1. Confirm `/health/` returns `{"status":"ok"}` over HTTPS.
2. Create two test accounts, add one to the other's workspace, and verify shared entries.
3. Verify an account outside the workspace cannot access it.
4. Create the production superuser with a one-off Container Apps console command.
5. Add custom domains and managed certificates; update `DJANGO_ALLOWED_HOSTS`, `DJANGO_CORS_ALLOWED_ORIGINS`, and rebuild the frontend with the final API URL.
6. Configure Azure Monitor availability checks and alerts for 5xx rate, container restarts, CPU/memory, database storage, and failed backups.

### Operations and security checklist

- Put database credentials and `DJANGO_SECRET_KEY` in Key Vault references; rotate them before launch.
- Replace token/local-storage auth with secure cookies or Entra ID if access expands beyond the trusted team.
- Use PostgreSQL private access/VNet integration and disable public network access.
- Set Container Apps min replicas to `0` only if cold starts are acceptable.
- Enable geo-redundant backup if the project requires regional disaster recovery.
- Export/restore a backup in a non-production environment quarterly.
- Keep Django/Next.js dependencies patched and enable dependency scanning.
- Treat time entries as potentially sensitive personnel data; define retention and deletion rules.

### Rollback

Container Apps keeps revisions. Deploy every release with a unique image tag, run smoke tests, then shift traffic. To roll back, route 100% traffic to the last healthy revision. Database changes must remain backward-compatible during rollout; for destructive migrations use expand/migrate/contract across separate releases. Take an on-demand PostgreSQL backup before high-risk schema changes.

## Product follow-ups after beta

The next highest-value additions are project creation/editing in the UI, manual entry editing, a proper invitation token/email flow, member removal and role changes, CSV export, time-zone aware reporting, audit logging, and cookie/Entra authentication.
