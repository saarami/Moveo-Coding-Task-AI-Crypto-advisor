# Implementation Progress

## Current Status

Current phase: Phase 8 — External API Integration
Status: Not started
Last updated: 2026-05-26

---

## Completed Phases

### Phase 1 — Project Setup

Status: Completed
Date: 2026-05-25

Implemented:
- Root-level `.gitignore` covering Python, Node, OS, and IDE files
- `README.md` with project overview, stack table, structure map, and setup instructions
- `docker-compose.yml` placeholder for PostgreSQL (used in Phase 3)
- `backend/` directory structure with empty Python packages (`__init__.py`)
- `backend/requirements.txt` with commented dependency list (populated in Phase 2)
- `backend/.env.example` with all expected environment variable keys
- `backend/Dockerfile` placeholder
- `frontend/src/` subdirectories: `pages/`, `components/`, `services/`, `context/`, `styles/`
- `frontend/.env.example` with `VITE_API_BASE_URL`

Files created:
- `.gitignore`
- `README.md`
- `docker-compose.yml`
- `backend/app/__init__.py`
- `backend/app/core/__init__.py`
- `backend/app/models/__init__.py`
- `backend/app/schemas/__init__.py`
- `backend/app/routes/__init__.py`
- `backend/app/services/__init__.py`
- `backend/app/repositories/__init__.py`
- `backend/app/utils/__init__.py`
- `backend/requirements.txt`
- `backend/.env.example`
- `backend/Dockerfile`
- `frontend/src/pages/.gitkeep`
- `frontend/src/components/.gitkeep`
- `frontend/src/services/.gitkeep`
- `frontend/src/context/.gitkeep`
- `frontend/src/styles/.gitkeep`
- `frontend/.env.example`

Files modified:
- `docs/implementation_progress.md` (this file)

How to test:
```powershell
Get-ChildItem -Recurse -Name | Where-Object { $_ -notmatch "\.git" }
```

Known issues:
- None

Next phase:
- Phase 2 — FastAPI Backend Setup

---

### Phase 2 — FastAPI Backend Setup

Status: Completed
Date: 2026-05-25

Implemented:
- `backend/app/core/config.py` — `Settings` class via pydantic-settings, reads from `.env`
- `backend/app/main.py` — FastAPI app with CORS middleware and `GET /health`
- `backend/requirements.txt` — pinned Phase 2 dependencies (fastapi, uvicorn, pydantic, pydantic-settings, python-dotenv)
- `backend/.env.example` — added `CORS_ORIGINS` key
- `frontend/.env.example` — renamed `VITE_API_URL` → `VITE_API_BASE_URL` for consistency
- Dependencies installed into `backend/.venv/`

Files created:
- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/.venv/` (virtual environment, not committed)

Files modified:
- `backend/requirements.txt`
- `backend/.env.example`
- `frontend/.env.example`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `GET /health` → `{"status": "ok"}`

Database changes:
- None

How to test:
```powershell
# From the project root
cd backend
.venv\Scripts\activate

# (Optional) copy env file
# copy .env.example .env

uvicorn app.main:app --reload
```

Then open in a browser or run:
```powershell
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
# Expected: {"status":"ok"}
```

Swagger UI: http://localhost:8000/docs
ReDoc:       http://localhost:8000/redoc

Known issues:
- None

Next phase:
- Phase 3 — PostgreSQL Setup

---

### Phase 3 — PostgreSQL Setup

Status: Completed
Date: 2026-05-25

Implemented:
- `docker-compose.yml` — finalized PostgreSQL 15 service (was a placeholder)
- `backend/app/core/config.py` — added `DATABASE_URL` field to `Settings`
- `backend/app/core/database.py` — SQLAlchemy engine, `SessionLocal`, `Base` (DeclarativeBase), and `get_db` dependency
- `backend/requirements.txt` — activated `sqlalchemy==2.0.36`, `alembic==1.14.0`, `psycopg2-binary==2.9.10`
- `backend/alembic/` — initialized via `alembic init alembic`
- `backend/alembic.ini` — removed hardcoded URL (URL is set programmatically)
- `backend/alembic/env.py` — wired to read `DATABASE_URL` from app settings and `Base.metadata` for autogenerate support

Files created:
- `backend/app/core/database.py`
- `backend/alembic/` (full directory: `env.py`, `script.py.mako`, `README`, `versions/`)
- `backend/alembic.ini`

Files modified:
- `backend/requirements.txt`
- `backend/app/core/config.py`
- `backend/alembic/env.py`
- `backend/alembic.ini`
- `docker-compose.yml`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- None

Database changes:
- No tables yet (Phase 4 creates models and the first migration)

How to test:
```powershell
# 1. Start PostgreSQL via Docker
docker-compose up -d

# 2. Copy env file (once)
copy backend\.env.example backend\.env

# 3. Activate venv
backend\.venv\Scripts\Activate.ps1

# 4. Verify the engine connects
cd backend
python -c "from app.core.database import engine; conn = engine.connect(); print('Connected OK'); conn.close()"

# 5. Verify Alembic reads config
python -m alembic current
# Expected output: (no revision applied yet — that is correct)
```

Port note:
- Docker maps host port **5433** → container port 5432 to avoid conflicts with any local PostgreSQL installation.
- `DATABASE_URL` in `.env.example` (and `.env`) must use port 5433: `postgresql://postgres:postgres@localhost:5433/crypto_advisor`.
- Connection test passed with this configuration.

Known issues:
- `alembic current` requires a live DB connection. If Docker is not running it will show a connection error — that is expected without Docker.

Next phase:
- Phase 4 — Database Models

---

### Phase 4 — Database Models

Status: Completed
Date: 2026-05-25

Implemented:
- `backend/app/models/user.py` — `User` table: id, name, email (unique+indexed), hashed_password, created_at, updated_at
- `backend/app/models/preference.py` — `UserPreference` table: id, user_id (unique FK→users), interested_assets, investor_type, content_types, created_at, updated_at
- `backend/app/models/daily_content.py` — `DailyContent` table: id, user_id (FK→users), date, market_news, coin_prices, ai_insight, meme, created_at; unique constraint on (user_id, date)
- `backend/app/models/feedback.py` — `Feedback` table: id, user_id (FK→users), daily_content_id (FK→daily_content), section_type, content_item_id, vote, created_at; unique constraint on (user_id, daily_content_id, section_type, content_item_id)
- `backend/app/models/__init__.py` — imports all four models so Alembic autogenerate can discover them
- `backend/alembic/env.py` — added `import app.models` to register models with `Base.metadata`
- Migration generated and applied: `7e926063c2cd_create_initial_tables.py`

Files created:
- `backend/app/models/user.py`
- `backend/app/models/preference.py`
- `backend/app/models/daily_content.py`
- `backend/app/models/feedback.py`
- `backend/alembic/versions/7e926063c2cd_create_initial_tables.py`

Files modified:
- `backend/app/models/__init__.py`
- `backend/alembic/env.py`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- None

Database changes:
- Tables created: `users`, `user_preferences`, `daily_content`, `feedback`, `alembic_version`
- Verified with `\dt` in psql — all five rows present

How to test:
```powershell
# Ensure Docker is running
docker-compose up -d

# Apply (or verify) migrations
cd backend
& .venv\Scripts\python.exe -m alembic upgrade head

# Check current revision
& .venv\Scripts\python.exe -m alembic current

# Verify tables in DB
docker exec moveocodingtaskaicryptoadvisor-db-1 psql -U postgres -d crypto_advisor -c "\dt"
# Expected: users, user_preferences, daily_content, feedback, alembic_version
```

Known issues:
- None

Next phase:
- Phase 5 — Authentication Backend

---

## Next Phase

### Phase 5 — Authentication Backend

Status: Completed
Date: 2026-05-26

Implemented:
- `backend/app/core/security.py` — `hash_password`, `verify_password` (passlib/bcrypt), `create_access_token`, `decode_access_token` (python-jose/JWT)
- `backend/app/core/deps.py` — `get_current_user` FastAPI dependency using `HTTPBearer`
- `backend/app/core/config.py` — added `JWT_ALGORITHM` and `ACCESS_TOKEN_EXPIRE_MINUTES` fields
- `backend/app/schemas/auth.py` — `RegisterRequest`, `LoginRequest`, `TokenResponse`, `UserResponse` (Pydantic v2)
- `backend/app/repositories/user_repository.py` — `get_by_email`, `get_by_id`, `create`
- `backend/app/services/auth_service.py` — `register`, `login`, `get_current_user`
- `backend/app/routes/auth.py` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- `backend/app/main.py` — registered auth router
- `backend/requirements.txt` — activated auth packages; pinned `bcrypt==3.2.2` (see known issues)

Files created:
- `backend/app/core/security.py`
- `backend/app/core/deps.py`
- `backend/app/schemas/auth.py`
- `backend/app/repositories/user_repository.py`
- `backend/app/services/auth_service.py`
- `backend/app/routes/auth.py`

Files modified:
- `backend/app/core/config.py`
- `backend/app/main.py`
- `backend/requirements.txt`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `POST /api/auth/register` → `201 {"access_token": "...", "token_type": "bearer"}`
- `POST /api/auth/login` → `200 {"access_token": "...", "token_type": "bearer"}`
- `GET /api/auth/me` → `200 {"id": 1, "name": "...", "email": "..."}`

Database changes:
- None (uses `users` table created in Phase 4)

How to test in Swagger (http://localhost:8000/docs):
1. Start Docker: `docker-compose up -d`
2. Start backend: `cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload`
3. **Register** — `POST /api/auth/register` with `{"name": "Alice", "email": "alice@example.com", "password": "secret123"}` → copy the `access_token`
4. **Authorize** — click the **Authorize** button (lock icon), enter `<token>` in the HTTPBearer field
5. **Login** — `POST /api/auth/login` with email + password → returns a new token
6. **Me** — `GET /api/auth/me` → returns `{id, name, email}`

Error cases verified:
- Duplicate email → `409 Conflict`
- Wrong password → `401 Unauthorized`
- Missing token → `401 Unauthorized` + `WWW-Authenticate: Bearer` header
- Invalid/expired token → `401 Unauthorized` + `WWW-Authenticate: Bearer` header

Post-phase fix (2026-05-26):
- `backend/app/core/deps.py` — changed `HTTPBearer()` to `HTTPBearer(auto_error=False)` and type-annotated `credentials` as `HTTPAuthorizationCredentials | None`. FastAPI's default `auto_error=True` raises HTTP 403 at the Starlette middleware level before the dependency runs; setting it to `False` lets `HTTPBearer` return `None` for missing/malformed Authorization headers so the dependency can raise 401 with the correct `WWW-Authenticate: Bearer` header.

Known issues:
- `passlib==1.7.4` is incompatible with `bcrypt>=4.0` (bcrypt 4+ raises `ValueError` for passwords > 72 bytes during internal wrap-bug detection). Pinned to `bcrypt==3.2.2` as the workaround. This is a known upstream issue in passlib (unmaintained since 2020); acceptable for MVP scope.

Next phase:
- Phase 6 — Onboarding Backend

---

### Phase 6 — Onboarding Backend

Status: Completed
Date: 2026-05-26

Implemented:
- `backend/app/schemas/preference.py` — `PreferenceRequest` (with validation for assets, investor_type, content_types) and `PreferenceResponse`
- `backend/app/repositories/preference_repository.py` — `get_by_user_id`, `create`, `update`
- `backend/app/services/onboarding_service.py` — `get_preferences` (404 if not set), `save_preferences` (upsert: create or update)
- `backend/app/routes/onboarding.py` — `GET /api/onboarding/preferences`, `POST /api/onboarding/preferences`
- `backend/app/main.py` — registered onboarding router

Storage: lists are stored as comma-separated strings in the DB (`interested_assets`, `content_types`) and deserialized to `list[str]` in the response.

Files created:
- `backend/app/schemas/preference.py`
- `backend/app/repositories/preference_repository.py`
- `backend/app/services/onboarding_service.py`
- `backend/app/routes/onboarding.py`

Files modified:
- `backend/app/main.py`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `GET /api/onboarding/preferences` → `200 PreferenceResponse` or `404` if not yet saved
- `POST /api/onboarding/preferences` → `201 PreferenceResponse` (creates or updates — idempotent)

Database changes:
- None (uses `user_preferences` table from Phase 4)

How to test in Swagger (http://localhost:8000/docs):
1. Start Docker: `docker-compose up -d`
2. Start backend: `cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload`
3. **Register** a new user → copy the `access_token`
4. **Authorize** in Swagger (lock icon) → paste token
5. `GET /api/onboarding/preferences` → `404` (not yet saved — expected)
6. `POST /api/onboarding/preferences` with body:
   ```json
   {"interested_assets": ["BTC", "ETH"], "investor_type": "hodler", "content_types": ["news", "prices"]}
   ```
   → `201` with saved preferences
7. `GET /api/onboarding/preferences` → `200` with the saved data
8. `POST` again with different values → updates the existing record (returns `201`)

Valid values:
- `interested_assets`: any of `BTC ETH SOL BNB XRP ADA DOGE AVAX DOT MATIC`
- `investor_type`: one of `beginner hodler day_trader nft_collector researcher`
- `content_types`: any of `news prices ai_insight meme`

Error cases verified:
- Not authenticated → `403 Forbidden`
- GET before onboarding → `404 Not Found`
- Invalid asset (e.g. `"FAKE"`) → `422 Unprocessable Entity`

Known issues:
- None

Next phase:
- Phase 7 — Dashboard Backend with Fallback Data

---

## Next Phase

### Phase 7 — Dashboard Backend with Fallback Data

Status: Completed
Date: 2026-05-26

Implemented:
- `backend/app/utils/fallback_data.py` — static coin prices (10 assets), 5 news articles, 6 AI insight variants, 6 memes; exported via `get_coin_prices`, `get_news`, `get_ai_insight`, `get_meme`
- `backend/app/schemas/dashboard.py` — `CoinPrice`, `NewsArticle`, `Meme`, `DashboardResponse` Pydantic models
- `backend/app/repositories/daily_content_repository.py` — `get_by_user_and_date`, `upsert` (JSON-serialises sections into `Text` columns)
- `backend/app/services/dashboard_service.py` — loads preferences (428 if missing), assembles fallback data, upserts into `daily_content`, returns `DashboardResponse`
- `backend/app/routes/dashboard.py` — `GET /api/dashboard` (JWT-protected)
- `backend/app/main.py` — registered dashboard router

Files created:
- `backend/app/utils/fallback_data.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/repositories/daily_content_repository.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/routes/dashboard.py`

Files modified:
- `backend/app/main.py`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `GET /api/dashboard` → `200 DashboardResponse`

Database changes:
- `daily_content` table is now written on every dashboard request (upserted once per user per day)

How to test in Swagger (http://localhost:8000/docs):
1. Start Docker: `docker-compose up -d`
2. Start backend: `cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload`
3. **Register** → copy `access_token`
4. **Authorize** in Swagger (lock icon)
5. `GET /api/dashboard` before onboarding → `428 Precondition Required`
6. `POST /api/onboarding/preferences` with any valid preferences
7. `GET /api/dashboard` → `200` with all four sections:
   - `coin_prices` — filtered to the user's `interested_assets`
   - `market_news` — 5 static articles
   - `ai_insight` — one of 6 static insight strings (random)
   - `meme` — one of 6 static memes (random)
8. Call again → same `date`, same data (upserted idempotently)

Error cases verified:
- No token → `401 Unauthorized`
- No preferences → `428 Precondition Required`
- Valid token + preferences → `200` dashboard

Known issues:
- `data_source` field is always `"fallback"` — will be updated to `"live"` in Phase 8 when external APIs respond successfully
- `ai_insight` and `meme` are random on each call (before caching kicks in); daily_content cache avoids regeneration for the same user+date within the same server session, but a server restart resets the random seed

Next phase:
- Phase 8 — External API Integration

---

## Next Phase

### Phase 8 — External API Integration

Goal:
Connect CoinGecko (prices), CryptoPanic (news), and OpenRouter/Hugging Face (AI insight) while keeping fallback data for each if APIs fail.

Status:
Not started

---

## Next Phase

### Phase 6 — Onboarding Backend

Goal:
Save and load user preferences (onboarding answers) via authenticated endpoints.

Status:
Not started

---

## Progress Update Template

Claude Code should update this file after each completed phase.

```md
## Phase X — Phase Name

Status: Completed

Implemented:
- ...

Files created:
- ...

Files modified:
- ...

Endpoints added:
- ...

Database changes:
- ...

How to test:
```bash
command here
```

Known issues:
- None

Next phase:
- Phase X+1 — Name
```
