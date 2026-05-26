# Implementation Progress

## Current Status

Current phase: Phase 11 — Frontend Onboarding
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

Status: Completed
Date: 2026-05-26

Implemented:
- `backend/app/services/coin_service.py` — CoinGecko `/simple/price` fetcher. Works without a key (free tier, rate-limited). Pro key raises limits. Falls back per-coin if any symbol is missing from the response; falls back entirely on network/HTTP error.
- `backend/app/services/news_service.py` — CryptoPanic `/api/v1/posts/` fetcher. Requires `CRYPTOPANIC_API_KEY`; returns fallback if key is absent or call fails.
- `backend/app/services/ai_service.py` — OpenRouter chat completion. Uses `meta-llama/llama-3.1-8b-instruct:free` model. Requires `OPENROUTER_API_KEY`; returns fallback insight if key is absent or call fails. Prompt is personalised to the user's assets and investor type.

Post-phase fix (2026-05-26) — OpenRouter model update and logging:
- Root cause: `meta-llama/llama-3.1-8b-instruct:free` was removed from OpenRouter (returned 404 "No endpoints found"). The generic `except Exception` block swallowed the `HTTPStatusError` silently, so fallback was returned with no visible error.
- Fix: replaced single hardcoded model with an ordered list (`_MODELS`). `_try_model()` tries each in turn, logs status code and error message on failure (without logging the API key), and returns the content on first success. Added `HTTP-Referer` and `X-Title` headers required by OpenRouter. Improved response parsing to handle `None` choices/content gracefully.
- Working primary model: `liquid/lfm-2.5-1.2b-instruct:free` (~1.2 s response time).
- File changed: `backend/app/services/ai_service.py`
- `backend/app/services/dashboard_service.py` — updated to call the three service modules instead of `fallback_data` directly. Sets `data_source="live"` when any API key is configured, `"fallback"` otherwise.

Post-phase fix (2026-05-26) — response quality:
- `backend/app/schemas/dashboard.py` — `meme` source label changed from `"static"` to `"static_json"` to accurately describe that memes are loaded from a static JSON-equivalent list in code.
- `backend/app/services/ai_service.py` — prompt updated to forbid market-timing language ("buying opportunity", "sell now", "buy now") and to always end with "This is not financial advice." Added normalisation in `_try_model()` to strip duplicate disclaimer lines the model may echo, ensuring the disclaimer appears exactly once.

Post-phase fix (2026-05-26) — per-section data sources:
- `backend/app/schemas/dashboard.py` — replaced `data_source: str` with `data_sources: DataSources` containing per-section `"live" | "fallback"` labels plus `meme: "static_json"`.
- All three service functions now return `(data, source_label)` tuples.
- `backend/app/utils/fallback_data.py` — fallback news `source` field changed from `"CryptoFallback News"` to `"Demo Content"` to avoid appearing misleading.
- `backend/app/services/dashboard_service.py` — updated to unpack tuples and build `DataSources` object.
- `backend/app/core/config.py` — added `COINGECKO_API_KEY`, `CRYPTOPANIC_API_KEY`, `OPENROUTER_API_KEY` settings (all default to empty string).
- `backend/requirements.txt` — activated `httpx==0.28.0`.

Files created:
- `backend/app/services/coin_service.py`
- `backend/app/services/news_service.py`
- `backend/app/services/ai_service.py`

Files modified:
- `backend/app/services/dashboard_service.py`
- `backend/app/core/config.py`
- `backend/requirements.txt`
- `docs/implementation_progress.md` (this file)

Endpoints changed:
- `GET /api/dashboard` — same shape, now fetches live data when keys are present

Environment variables needed (in `backend/.env`):
| Variable | Required | Notes |
|---|---|---|
| `COINGECKO_API_KEY` | No | Leave empty for free public API (rate-limited); set for Pro tier |
| `CRYPTOPANIC_API_KEY` | Yes for live news | Get at https://cryptopanic.com/developers/api/ |
| `OPENROUTER_API_KEY` | Yes for live AI | Get at https://openrouter.ai — free models available |

How to test in Swagger (http://localhost:8000/docs):
1. `docker-compose up -d` then `cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload`
2. Register → Authorize → onboard → `GET /api/dashboard`
3. Check `data_sources` in the response — each section independently reports `"live"`, `"fallback"`, or `"static"`.
4. Without any optional keys: `coin_prices="live"` (CoinGecko free), `market_news="fallback"`, `ai_insight="fallback"`, `meme="static"`.
5. Set `CRYPTOPANIC_API_KEY` → `market_news` becomes `"live"`.
6. Set `OPENROUTER_API_KEY` → `ai_insight` becomes `"live"`.
7. Set an invalid key → the affected section falls back and returns `200`; the rest are unaffected.

Error behaviour verified:
- No API keys → `data_sources: {coin_prices:"live", market_news:"fallback", ai_insight:"fallback", meme:"static"}`, HTTP `200`
- CoinGecko live prices fetched without a key (free public API) ✓
- Invalid key / network timeout → logged as WARNING, fallback returned, HTTP `200`

Known issues:
- CoinGecko free tier is rate-limited (~30 req/min across all clients sharing the IP). Under heavy use, the `/simple/price` endpoint may return `429`; the fallback handles this gracefully.
- CoinGecko `/simple/price` does not return full coin names, so `name` field equals `symbol` in live mode. Phase 8+ could use `/coins/markets` to get proper names.
- OpenRouter free-model responses can be slow (up to 10–15 s). Timeout is set to 15 s; fallback triggers if exceeded.

Next phase:
- Phase 9 — React Frontend Setup

---

### Phase 9 — React Frontend Setup

Status: Completed
Date: 2026-05-26

Implemented:
- `frontend/package.json` — React 18, react-dom, react-router-dom v6; Vite 6 + @vitejs/plugin-react as dev deps
- `frontend/vite.config.js` — Vite config with React plugin, dev server on port 5173
- `frontend/index.html` — HTML entry point mounting `#root`
- `frontend/src/main.jsx` — React 18 `createRoot` entry point
- `frontend/src/App.jsx` — `BrowserRouter` with four routes: `/login`, `/signup`, `/onboarding`, `/dashboard`; catch-all redirects to `/login`
- `frontend/src/pages/LoginPage.jsx` — placeholder page
- `frontend/src/pages/SignupPage.jsx` — placeholder page
- `frontend/src/pages/OnboardingPage.jsx` — placeholder page
- `frontend/src/pages/DashboardPage.jsx` — placeholder page
- Existing placeholder directories retained: `components/`, `services/`, `context/`, `styles/`

Files created:
- `frontend/package.json`
- `frontend/vite.config.js`
- `frontend/index.html`
- `frontend/src/main.jsx`
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`

Files modified:
- `docs/implementation_progress.md` (this file)

Endpoints added:
- None (frontend only)

Database changes:
- None

How to test:
```powershell
cd frontend
npm run dev
# Open http://localhost:5173 — redirects to /login (shows "Login" heading)
# Navigate to /signup, /onboarding, /dashboard — each shows its placeholder heading
# Navigate to /anything-else — redirects back to /login
```

Known issues:
- None

Next phase:
- Phase 10 — Frontend Authentication

---

### Phase 10 — Frontend Authentication

Status: Completed
Date: 2026-05-26

Implemented:
- `frontend/src/services/api.js` — fetch wrapper that reads `VITE_API_BASE_URL` (fallback: `http://localhost:8000`), attaches `Authorization: Bearer <token>` from localStorage on every request, and normalises error messages from FastAPI's `detail` field (handles both string and array formats)
- `frontend/src/services/authApi.js` — `register`, `login`, `getMe` functions that call `/api/auth/register`, `/api/auth/login`, `/api/auth/me`
- `frontend/src/context/AuthContext.jsx` — `AuthProvider` that validates the stored token via `GET /api/auth/me` on mount; exposes `user`, `loading`, `storeLogin`, `logout` via `useAuth` hook
- `frontend/src/components/ProtectedRoute.jsx` — redirects unauthenticated users to `/login`; shows "Loading…" while the token is being validated on mount
- `frontend/src/pages/LoginPage.jsx` — email + password form; on success calls `/api/auth/login` then `/api/auth/me`, stores token and user, redirects to `/dashboard`
- `frontend/src/pages/SignupPage.jsx` — name + email + password form; on success calls `/api/auth/register` then `/api/auth/me`, stores token and user, redirects to `/onboarding`
- `frontend/src/pages/OnboardingPage.jsx` — updated to display `user.name` and a Logout button
- `frontend/src/pages/DashboardPage.jsx` — updated to display `user.name` and a Logout button
- `frontend/src/App.jsx` — wrapped in `AuthProvider`; `/onboarding` and `/dashboard` wrapped in `ProtectedRoute`

Token storage: `localStorage` key `token`.

Files created:
- `frontend/src/services/api.js`
- `frontend/src/services/authApi.js`
- `frontend/src/context/AuthContext.jsx`
- `frontend/src/components/ProtectedRoute.jsx`

Files modified:
- `frontend/src/App.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `docs/implementation_progress.md` (this file)

Endpoints used:
- `POST /api/auth/register` — signup
- `POST /api/auth/login` — login
- `GET /api/auth/me` — fetch user profile after login/signup and on page reload

Database changes:
- None

How to test:
```powershell
# 1. Start backend
docker-compose up -d
cd backend
& .venv\Scripts\python.exe -m uvicorn app.main:app --reload

# 2. Start frontend (separate terminal)
cd frontend
npm run dev
# Open http://localhost:5173
```

Flow to test:
1. Navigate to `/signup` — fill in name, email, password → submit → redirected to `/onboarding` with "Welcome, <name>!"
2. Click Logout → redirected to `/login`
3. Login with the same credentials → redirected to `/dashboard` with "Welcome, <name>!"
4. Refresh the page → still on `/dashboard` (token persists in localStorage)
5. Click Logout → redirected to `/login`
6. Navigate directly to `/dashboard` without a token → redirected to `/login`

Verifying the JWT is stored and sent:
- Open DevTools → Application → Local Storage → `http://localhost:5173`
- Key `token` should appear after login/signup
- Open DevTools → Network → filter by `/api/` → check request headers for `Authorization: Bearer <token>`

Error cases:
- Wrong password → red error text "Invalid credentials" (or similar) below the form
- Duplicate email → red error text "Email already registered"
- Expired/invalid token in localStorage → `getMe` fails on mount; token is removed, user stays unauthenticated

Known issues:
- No redirect for already-authenticated users visiting `/login` or `/signup` — Phase 14 UI polish can add this
- Password field has no minimum length validation beyond the HTML `required` attribute; backend enforces nothing either beyond non-empty

Next phase:
- Phase 11 — Frontend Onboarding

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
