# Implementation Progress

## Current Status

Current phase: Phase 15 — Documentation
Status: Not started
Last updated: 2026-05-26

---

### Phase 14.2 — Preferences Page

Status: Completed
Date: 2026-05-26

Goal: Add a protected `/preferences` page where authenticated users can edit the preferences set during onboarding.

Implemented:
- `frontend/src/pages/PreferencesPage.jsx` — new page. On mount, loads existing preferences via `GET /api/onboarding/preferences` and pre-populates all three sections. The form uses the same chip grid (assets + investor type) and content-card grid (content priorities) as OnboardingPage. On submit, calls `POST /api/onboarding/preferences` (upsert). Shows a green `alert-success` on success; user stays on the page (no redirect). "Dashboard" back-button and Logout button in the top bar.
- `frontend/src/App.jsx` — added `/preferences` route wrapped in `ProtectedRoute`.
- `frontend/src/pages/DashboardPage.jsx` — added a "Preferences" button (Settings icon) in the dashboard header alongside Logout; navigates to `/preferences`.
- `frontend/src/styles/global.css` — added `.alert-success` style (green background, green border, soft green text) to mirror the existing `.alert-error` pattern.

Files created:
- `frontend/src/pages/PreferencesPage.jsx`

Files modified:
- `frontend/src/App.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/styles/global.css`
- `docs/implementation_progress.md` (this file)

Endpoints used (no backend changes):
- `GET /api/onboarding/preferences` — pre-populate form on load
- `POST /api/onboarding/preferences` — save updates (existing upsert endpoint)

Database changes:
- None

How to test:
```powershell
cd frontend
npm run dev
# Open http://localhost:5173
```

Flow:
1. Log in → go to Dashboard → click "Preferences" button in the header
2. All three sections are pre-populated with saved values
3. Change any selection (e.g. toggle BTC off, add SOL, change investor type)
4. Click "Save Preferences" → green "Preferences saved." message appears; stay on page
5. Click "Dashboard" → return to `/dashboard`
6. Dashboard card order reflects the new `content_types` priority

Edge cases:
- Visiting `/preferences` without a token → `ProtectedRoute` redirects to `/login`
- Changing selections before saving clears the success/error banner
- If `getPreferences()` fails on load (no preferences yet), the form opens empty (same validation rules apply)

Known issues:
- Dashboard card ordering only updates after navigating back and reloading the dashboard (the `useEffect` in DashboardPage re-fetches preferences on mount). No live sync while on the preferences page — this is intentional for MVP simplicity.

Next phase:
- Phase 15 — Documentation

---

### Phase 14.1 — Visual Redesign (Fintech Terminal Style)

Status: Completed
Date: 2026-05-26

Goal: Replace the generic dark-purple AI SaaS aesthetic with a professional fintech / crypto intelligence terminal style.

Design changes:
- **Palette**: Replaced all purple (`#7c6ef7`, `#a78bfa`) with graphite (`--bg: #0e1118`, `--surface: #141921`) + emerald green (`--accent: #10b981`) + amber (`--amber: #e8a020`). No gradients on buttons or logos.
- **Typography**: Added `--mono` (Courier New / Consolas) for prices, dates, badges, and monospace numbers throughout.
- **Auth logo**: Replaced glowing purple gradient box + Zap icon with a thin green-bordered dark box + Terminal icon. Same on the onboarding top bar and dashboard header.
- **Buttons**: Solid green (`var(--accent)`) instead of purple gradient. Input focus ring is green.
- **Onboarding**: Removed emoji investor type cards; replaced with the same chip grid used for assets. Added a sticky top bar with logo + logout. Restructured layout into `.onboarding-topbar` + `.onboarding-body`.
- **Dashboard header**: Tighter padding; Terminal icon in green-bordered box; user badge shows investor type from prefs (not from dashboard response, which fixes a stale-data bug). Dashboard title changed from "Your Daily Dashboard" to "Market Intelligence".
- **Tracking bar**: Added a row of monospace asset tags (e.g. `BTC ETH SOL`) under the dashboard title, populated from the user's saved preferences.
- **Section cards**: Smaller icon badges (28 px); uppercase section titles with letter-spacing (terminal style); thinner hover border with a subtle green tint (`rgba(16,185,129,0.18)`). Meme card gets `.section-card--muted` (slightly darker background) to visually de-emphasise secondary content.
- **Section labels**: `ai_insight` → "ANALYST BRIEF"; `meme` → "MARKET MEME".
- **Section icons**: AI section uses `Bot` icon (amber); Meme section keeps `Smile` (grey/muted).
- **Source badges**: Smaller, square-radius `3px` badges with tighter padding.
- **Analyst Brief (AI)**: Replaced italic quote with a boxed block (`border-left: 3px solid var(--amber)`) and an amber "AI-generated analysis" tag above the text. No italic.
- **Coin Prices**: Column headers and price values use monospace font. Thinner rows. Column renamed to "Asset" / "Price (USD)" / "24h Chg".
- **Market News**: Restructured as a two-column flex layout — article title + source on the left, publication date (short format) on the right.
- **Market Meme**: Reduced max-height from 360 px to 220 px. Card uses `.section-card--muted`.
- **Disclaimer**: Removed purple tint; uses plain surface + border.
- **Border radius**: Reduced across the board (sm: 5px, base: 8px, lg: 10px) for a crisper data-product feel.
- **Animations**: Kept same framer-motion stagger; removed `whileHover` lift on section cards (replaced with CSS border tint).

Files modified:
- `frontend/src/styles/global.css` — full rewrite
- `frontend/src/pages/DashboardPage.jsx` — new icons, SECTION_LABELS, prefs state, tracking bar, AiInsight component
- `frontend/src/pages/LoginPage.jsx` — Terminal icon, minor spacing
- `frontend/src/pages/SignupPage.jsx` — Terminal icon, minor spacing
- `frontend/src/pages/OnboardingPage.jsx` — top bar, chip-based investor types, new layout classes

Files created:
- None

Endpoints changed:
- None (backend untouched)

Database changes:
- None

How to test:
```powershell
cd frontend
npm run dev
# Open http://localhost:5173
```

Visual checklist:
1. `/login` — dark card; green-bordered Terminal icon; green focus ring on inputs; flat green "Sign In" button.
2. `/signup` — same system.
3. `/onboarding` — sticky top bar with Terminal logo; asset and investor type sections both use chip buttons; content type section uses icon cards with green accent when selected; flat green submit button.
4. `/dashboard` — graphite background; compact sticky header; "Market Intelligence" title; tracking bar showing watched assets in monospace tags; ANALYST BRIEF card has amber left-border and AI tag; COIN PRICES uses monospace numbers; MARKET NEWS shows date on the right; MARKET MEME has smaller image and muted card background; vote buttons use green/red highlights; section titles are uppercase.
5. Mobile (DevTools 390 px) — top bars collapse logo text; cards span full width.

Known issues:
- None

Next phase:
- Phase 15 — Documentation

---

### Phase 10.5 — Backend Docker Support

Status: Completed
Date: 2026-05-26

Implemented:
- `backend/Dockerfile` — removed placeholder comment; layers are: base image → install deps → copy code → expose 8000. Default CMD is overridden by docker-compose.
- `backend/.dockerignore` — excludes `.venv/`, `.env`, `__pycache__/`, compiled Python files from the build context, keeping the image lean and preventing secrets from leaking.
- `docker-compose.yml` — fully updated:
  - Postgres service renamed from `db` → `postgres`; added `healthcheck` (`pg_isready`) so the backend only starts after the DB is accepting connections.
  - Added `backend` service: builds from `./backend`, depends on `postgres` with `condition: service_healthy`, runs `alembic upgrade head && uvicorn ...` on startup, exposes port 8000.
  - All environment variables passed inline; API keys (`COINGECKO_API_KEY`, `CRYPTOPANIC_API_KEY`, `OPENROUTER_API_KEY`) default to empty and can be overridden via a root-level `.env` file.
  - Removed deprecated `version: "3.9"` field.
- `.gitignore` — changed `*.dockerignore` → comment, so `backend/.dockerignore` is now committed.
- `backend/.env.example` — added note clarifying the two DATABASE_URL variants (local vs Docker).

Files created:
- `backend/.dockerignore`

Files modified:
- `backend/Dockerfile`
- `docker-compose.yml`
- `.gitignore`
- `backend/.env.example`
- `docs/implementation_progress.md` (this file)

Endpoints changed:
- None (same API, now also accessible through Docker)

Database changes:
- None (`alembic upgrade head` in the startup command applies any pending migrations automatically; idempotent if already applied)

How to run — local development (no Docker for backend):
```powershell
# 1. Start only PostgreSQL
docker-compose up -d postgres

# 2. Activate venv and start uvicorn
cd backend
.venv\Scripts\Activate.ps1
python -m uvicorn app.main:app --reload
# backend available at http://localhost:8000
# uses DATABASE_URL from backend/.env (localhost:5433)
```

How to run — full Docker Compose:
```powershell
# Build and start both postgres + backend
docker-compose up -d --build

# View backend logs
docker-compose logs -f backend

# Stop everything
docker-compose down
```

Optional: to pass API keys to the Docker backend, create a root-level `.env` (not committed):
```
OPENROUTER_API_KEY=sk-or-v1-...
CRYPTOPANIC_API_KEY=...
SECRET_KEY=your-secure-secret
```
Docker Compose picks up root `.env` automatically for variable substitution.

How to test /health and auth:
```powershell
# Health
Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing
# Expected: {"status":"ok"}

# Register
$body = '{"name":"Test","email":"test@example.com","password":"secret123"}'
Invoke-WebRequest -Uri http://localhost:8000/api/auth/register -Method POST -Body $body -ContentType "application/json" -UseBasicParsing
# Expected: {"access_token":"...","token_type":"bearer"}
```

Both tests passed with the Docker backend. Alembic ran automatically and reported "Context impl PostgresqlImpl / Will assume transactional DDL" in the logs.

Known issues:
- The postgres service was renamed from `db` to `postgres`. Running `docker-compose up -d --remove-orphans` removes the stale `db` container. The `postgres_data` volume is reused, so no data is lost.
- `SECRET_KEY` defaults to `change-me-in-production` in Docker Compose — must be overridden in a root `.env` before deploying.

Next phase:
- Phase 11 — Frontend Onboarding

---

### Phase 14 — UI Polish

Status: Completed
Date: 2026-05-26

Implemented:
- `frontend/src/styles/global.css` — full dark-theme design system with CSS custom properties (`--bg`, `--surface`, `--accent`, `--green`, `--red`, etc.), base reset, and CSS classes for auth layout, forms, buttons, badges, news list, prices table, AI quote block, meme, vote buttons, onboarding chips/cards, loading spinner, disclaimer, and responsive breakpoints at 600 px.
- `frontend/src/main.jsx` — added `import './styles/global.css'` to apply global styles.
- `frontend/src/pages/LoginPage.jsx` — complete redesign: centered dark card with subtle radial-gradient background, animated entrance (framer-motion), lucide-react icons (Zap logo, Mail, Lock, LogIn), styled inputs with focus ring, gradient primary button, inline error alert.
- `frontend/src/pages/SignupPage.jsx` — same card pattern as login; User/Mail/Lock/UserPlus icons; animated entrance.
- `frontend/src/pages/OnboardingPage.jsx` — three staggered animated sections; asset chips (pill-style toggle buttons); investor type as clickable emoji cards in a CSS grid; content priority as icon cards; styled error alert; gradient submit button with arrow icon; spinner loading state.
- `frontend/src/pages/DashboardPage.jsx` — sticky dark glass header with logo, user badge, logout button; staggered card entrance with subtle hover-lift (framer-motion whileHover y: -2); per-section colour-coded icon badges (cyan/news, green/prices, purple/AI, amber/meme); source badges (live = green dot + green pill, fallback = grey pill); market news list with ArrowUpRight links; prices table with per-coin symbol badge and TrendingUp/TrendingDown icons in green/red; AI insight as accent-bar quote block; meme with border and centred caption; financial disclaimer at bottom.
- `frontend/src/components/VoteButtons.jsx` — replaced emoji buttons with lucide-react `ThumbsUp`/`ThumbsDown` icons + "Yes"/"No" text labels, pill-shaped styled buttons, animated "Saved ✓" confirmation; `Check` icon; all logic unchanged.
- `frontend/src/components/ProtectedRoute.jsx` — loading state now shows styled spinner instead of plain text.

Packages added:
- `framer-motion` — page/card/button animations (entrance, hover-lift, tap-scale, fade-in)
- `lucide-react` — icons throughout auth, onboarding, and dashboard

Files created:
- `frontend/src/styles/global.css`

Files modified:
- `frontend/src/main.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `frontend/src/pages/SignupPage.jsx`
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/components/VoteButtons.jsx`
- `frontend/src/components/ProtectedRoute.jsx`
- `frontend/package.json` (framer-motion + lucide-react added to dependencies)
- `docs/implementation_progress.md` (this file)

Endpoints changed:
- None (backend untouched)

Database changes:
- None

How to test:
```powershell
# 1. Start backend
docker-compose up -d
# or: cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload

# 2. Start frontend
cd frontend
npm run dev
# Open http://localhost:5173
```

UI flow to test:
1. `/login` — dark card fades in; type email + password; button shows spinner on submit; wrong password shows red alert.
2. `/signup` — same card pattern; three fields; error shows inline.
3. `/onboarding` — three staggered sections animate in; click asset chips to toggle; click investor cards; click content cards; submit → spinner → redirect.
4. `/dashboard` — spinner loading state; four cards stagger in with lift-on-hover; source badge colour (green=live, grey=fallback); prices table shows ↑ green / ↓ red; AI insight has purple accent bar; meme has border; vote "Yes"/"No" pill buttons highlight on click; "Saved ✓" appears after voting; disclaimer at bottom.
5. Mobile (DevTools 390 px): header collapses (user badge hidden, logo text hidden); cards span full width; onboarding grids reflow.

Post-phase fix (2026-05-26) — authenticated redirect guard:
- Added `frontend/src/components/PublicRoute.jsx` — mirrors `ProtectedRoute` but inverted; if `user` is present, redirects to `/dashboard`; otherwise renders children. Shows the same spinner during auth load.
- `frontend/src/App.jsx` — wrapped `/login` and `/signup` routes with `PublicRoute`.

Known issues:
- Meme images are served from imgflip.com; if that CDN is slow the image loads late with no placeholder skeleton. A low-effort improvement for future iterations.

Next phase:
- Phase 15 — Documentation

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

### Phase 11 — Frontend Onboarding

Status: Completed
Date: 2026-05-26

Implemented:
- `frontend/src/services/onboardingApi.js` — `getPreferences` (`GET /api/onboarding/preferences`) and `savePreferences` (`POST /api/onboarding/preferences`)
- `frontend/src/pages/OnboardingPage.jsx` — full preference form:
  - On mount: calls `getPreferences()`; if it succeeds (200) the user already completed onboarding and is redirected to `/dashboard`. If it fails (404) the form is shown.
  - Multi-checkbox for interested assets (10 coins: BTC, ETH, SOL, BNB, XRP, ADA, DOGE, AVAX, DOT, MATIC)
  - Radio buttons for investor type (beginner, hodler, day_trader, nft_collector, researcher)
  - Multi-checkbox for content types (news, prices, ai_insight, meme)
  - Client-side validation (at least one asset, investor type required, at least one content type)
  - On submit: POSTs to backend → redirects to `/dashboard`
  - Logout button
- `frontend/src/pages/LoginPage.jsx` — after successful login, calls `getPreferences()`:
  - 200 → redirects to `/dashboard` (returning user, already onboarded)
  - 404 / error → redirects to `/onboarding` (returning user, not yet onboarded)

Redirect logic summary:
- Signup → `/onboarding` (always — new user)
- Login with preferences → `/dashboard`
- Login without preferences → `/onboarding`
- Navigate to `/onboarding` when already onboarded → redirected to `/dashboard`
- Navigate to `/dashboard` or `/onboarding` without a token → redirected to `/login` (ProtectedRoute)

Files created:
- `frontend/src/services/onboardingApi.js`

Files modified:
- `frontend/src/pages/OnboardingPage.jsx`
- `frontend/src/pages/LoginPage.jsx`
- `docs/implementation_progress.md` (this file)

Endpoints used:
- `GET /api/onboarding/preferences` — check existing preferences
- `POST /api/onboarding/preferences` — save preferences

Database changes:
- None (uses `user_preferences` table from Phase 4/6)

How to test:
```powershell
# Start backend (Docker or local)
docker-compose up -d
# or: cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload

# Start frontend
cd frontend
npm run dev
# Open http://localhost:5173
```

Onboarding flow:
1. Sign up with a new account → lands on `/onboarding`
2. Select at least one asset (e.g. BTC, ETH), pick an investor type, pick content types
3. Click "Save and go to Dashboard" → redirects to `/dashboard` (placeholder)
4. Logout → login with same credentials → lands directly on `/dashboard` (preferences already exist)
5. Log in with a different account that has no preferences → lands on `/onboarding`

Edge cases verified (logic):
- Visiting `/onboarding` when already onboarded → immediately redirected to `/dashboard`
- Submitting with no assets selected → error "Select at least one asset."
- Submitting without investor type → error "Select your investor type."

Known issues:
- Investor type radio buttons are displayed inline; no visual grouping. Phase 14 UI polish will address this.
- The form does not pre-populate with existing preferences on re-visit (since already-onboarded users are immediately redirected). If an update preferences flow is needed in future, it can be added as a settings page.

Next phase:
- Phase 12 — Frontend Dashboard

---

### Phase 12 — Frontend Dashboard

Status: Completed
Date: 2026-05-26

Implemented:
- `frontend/src/services/dashboardApi.js` — `getDashboard()` calling `GET /api/dashboard`
- `frontend/src/pages/DashboardPage.jsx` — full dashboard with four section cards:
  - **Market News** — article list; title links to source URL (or plain text for fallback `#` URLs); shows source name and publication date
  - **Coin Prices** — table with symbol, USD price (locale-formatted), 24h change (green if positive, red if negative)
  - **AI Insight** — plain text block
  - **Crypto Meme** — centred image with caption
  - Each card displays a source badge (`live` in green, `fallback`/`static_json` in grey) pulled from `data_sources` in the API response
- Card ordering uses the user's saved `content_types` preference: selected types appear first in their saved order, the remaining sections follow in default order (`news → prices → ai_insight → meme`)
- Loading state while `Promise.all([getDashboard(), getPreferences()])` resolves
- Error state with a Logout button if `getDashboard()` fails
- Preferences fetch failure is non-fatal: cards fall back to default order

Card ordering logic (`orderedSections`):
```js
// selected content types first (in saved order), rest in default order
const selected = contentTypes.filter(t => ALL_SECTIONS.includes(t))
const rest = ALL_SECTIONS.filter(t => !selected.includes(t))
return [...selected, ...rest]
```

Example: if user saved `content_types = ['prices', 'meme']`, the order is:
1. Coin Prices
2. Crypto Meme
3. Market News
4. AI Insight

Files created:
- `frontend/src/services/dashboardApi.js`

Files modified:
- `frontend/src/pages/DashboardPage.jsx`
- `docs/implementation_progress.md` (this file)

Endpoints used:
- `GET /api/dashboard` — full dashboard data
- `GET /api/onboarding/preferences` — user's content_types for card ordering

Database changes:
- None

How to test:
```powershell
# Ensure backend is running
docker-compose up -d
# or: cd backend && .venv\Scripts\python.exe -m uvicorn app.main:app --reload

# Start frontend
cd frontend
npm run dev
# Open http://localhost:5173
```

Flow:
1. Log in → if already onboarded → `/dashboard`
2. Check that all four sections are visible: Market News, Coin Prices, AI Insight, Crypto Meme
3. Verify card order matches the content_types saved during onboarding (e.g. if "prices" was selected first, Coin Prices card appears at the top)
4. Each card shows a source badge (live / fallback / static_json)
5. Coin prices show green for positive 24h change, red for negative
6. Logout button redirects to `/login`

Known issues:
- `GET /api/dashboard` response does not include `daily_content_id` — needed for Phase 13 feedback voting. The backend `DashboardResponse` schema and `daily_content_repository.upsert` will need to be updated in Phase 13 to return the snapshot ID.
- CoinGecko live prices use symbol as name (e.g. "BTC" for both name and symbol); full coin names are only in the fallback data. This is a known Phase 8 limitation.
- Meme images are hosted on imgflip.com; they depend on that service being available.

Next phase:
- Phase 13 — Feedback System

---

### Phase 13 — Feedback System

Status: Completed
Date: 2026-05-26

Implemented:

Backend:
- `backend/app/schemas/feedback.py` — `FeedbackRequest` (daily_content_id, section_type as `Literal[...]`, content_item_id, vote as `Literal["up","down"]`) and `FeedbackResponse`
- `backend/app/repositories/feedback_repository.py` — `upsert`: query-then-update if exists, insert if not; returns the `Feedback` ORM object with the current vote
- `backend/app/services/feedback_service.py` — validates that `daily_content_id` belongs to the current user (404 if not found or wrong user), then calls the repository
- `backend/app/routes/feedback.py` — `POST /api/feedback` (JWT-protected); no status override (defaults to 200)
- `backend/app/repositories/daily_content_repository.py` — added `get_by_id` for ownership validation
- `backend/app/schemas/dashboard.py` — added `daily_content_id: int` to `DashboardResponse`
- `backend/app/services/dashboard_service.py` — captures return value of `daily_content_repository.upsert` and includes `record.id` as `daily_content_id` in the response
- `backend/app/main.py` — registered `feedback.router`

Frontend:
- `frontend/src/services/feedbackApi.js` — `submitVote(daily_content_id, section_type, content_item_id, vote)` → `POST /api/feedback`
- `frontend/src/components/VoteButtons.jsx` — 👍/👎 buttons; tracks voted state locally; highlights the active button; shows "Saved!" on success, error message on failure; re-voting the same section sends a new request (idempotent on the backend)
- `frontend/src/pages/DashboardPage.jsx` — imports `VoteButtons`; added `SECTION_TYPE` map (frontend key → backend `section_type`); each `SectionCard` renders `VoteButtons` at the bottom with `dailyContentId`, `sectionType`, and `contentItemId`

How feedback is saved:
- Each section card renders 👍/👎 buttons.
- `section_type` maps frontend key → backend value: `news → market_news`, `prices → coin_prices`, `ai_insight → ai_insight`, `meme → meme`.
- `content_item_id` is set to the same value as `section_type` (section-level granularity). The unique constraint `uq_feedback_vote(user_id, daily_content_id, section_type, content_item_id)` means one vote per section per user per day.
- Re-voting changes the existing row's `vote` value (upsert). The row ID stays the same, confirming no duplicate is created.

Files created:
- `backend/app/schemas/feedback.py`
- `backend/app/repositories/feedback_repository.py`
- `backend/app/services/feedback_service.py`
- `backend/app/routes/feedback.py`
- `frontend/src/services/feedbackApi.js`
- `frontend/src/components/VoteButtons.jsx`

Files modified:
- `backend/app/repositories/daily_content_repository.py`
- `backend/app/schemas/dashboard.py`
- `backend/app/services/dashboard_service.py`
- `backend/app/main.py`
- `frontend/src/pages/DashboardPage.jsx`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `POST /api/feedback` → `200 FeedbackResponse`

How to test voting from the frontend:
```powershell
docker-compose up -d
cd frontend && npm run dev
# Open http://localhost:5173, log in, go to the dashboard
```
1. Each card shows 👍 and 👎 buttons at the bottom
2. Click 👍 on any card → button highlights green + "Saved!" appears
3. Click 👎 on the same card → button changes to red highlight (vote updated)
4. Both buttons on the same card can be toggled; the backend always keeps one row per section

How to verify feedback rows in PostgreSQL:
```powershell
docker exec moveocodingtaskaicryptoadvisor-postgres-1 psql -U postgres -d crypto_advisor -c "SELECT id, user_id, daily_content_id, section_type, vote, created_at FROM feedback ORDER BY id;"
```
Verified: voting creates one row; re-voting updates the same row (same `id`).

Known issues:
- Vote state resets on page refresh — no initial fetch of existing votes. If a user already voted today and refreshes the page, the buttons show as unvoted. Adding a `GET /api/feedback` endpoint and loading existing votes on mount would fix this; deferred to Phase 14 or later.
- `content_item_id` is set to the section_type string rather than a per-item identifier (e.g., news article ID). This means one vote covers the entire section, not individual articles or coins. Fine for MVP; per-item voting could be added later by using `article.id` or `coin.symbol` per row.

Next phase:
- Phase 14 — UI Polish

---

### Phase 13.5 — Restore Saved Feedback Votes

Status: Completed
Date: 2026-05-26

Implemented:

Backend:
- `backend/app/repositories/feedback_repository.py` — added `get_votes_by_daily_content(db, user_id, daily_content_id)`: queries all feedback rows for the user+daily_content, returns a dict of all four section types → vote string or None
- `backend/app/schemas/feedback.py` — added `VotesResponse(votes: dict[str, str | None])`
- `backend/app/services/feedback_service.py` — added `get_votes`: validates ownership of the daily_content record, then returns votes via the repository
- `backend/app/routes/feedback.py` — added `GET /api/feedback?daily_content_id=<id>` (JWT-protected)

Frontend:
- `frontend/src/services/feedbackApi.js` — added `getVotes(daily_content_id)` → `GET /api/feedback?daily_content_id=...`
- `frontend/src/components/VoteButtons.jsx` — added `initialVote` prop (defaults to null); `voted` state initialised from it; added separate `justSaved` boolean so the "Saved!" label only appears after a user action in the current session, not when a vote is merely restored on load
- `frontend/src/pages/DashboardPage.jsx` — `useEffect` converted to `async function load()`; after dashboard + prefs are fetched, `getVotes` is called with the now-known `daily_content_id`; result stored in `votes` state (non-fatal if it fails — defaults to `{}`); `votes` passed down through `SectionCard` → `VoteButtons` as `initialVote`

Files modified:
- `backend/app/repositories/feedback_repository.py`
- `backend/app/schemas/feedback.py`
- `backend/app/services/feedback_service.py`
- `backend/app/routes/feedback.py`
- `frontend/src/services/feedbackApi.js`
- `frontend/src/components/VoteButtons.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `docs/implementation_progress.md` (this file)

Endpoints added:
- `GET /api/feedback?daily_content_id=<id>` → `200 { "votes": { "market_news": "up"|"down"|null, ... } }`

How to test that votes persist after refresh:
1. Log in → go to `/dashboard`
2. Click 👍 on any card → button highlights green
3. Refresh the page
4. The 👍 button on that card is highlighted from the start (no user action needed)
5. "Saved!" does NOT appear on load — only after a new click

Verified via API: `GET /api/feedback?daily_content_id=8` returned `{ ai_insight: "down" }` for the vote cast in Phase 13 testing.

Known issues:
- None for the scope of this fix

Next phase:
- Phase 14 — UI Polish

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
