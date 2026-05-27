# AI Crypto Advisor — Technical Walkthrough

This document is a comprehensive reference for technical interview preparation. Every function, class, and component is documented with concrete details drawn directly from the source code.

---

## 1. Architecture Overview

### Full Request Lifecycle — Example: POST /api/feedback

```
Browser (React)
  │
  ├─ VoteButtons.jsx calls handleVote("up")
  │
  ├─ feedbackApi.js: submitVote(daily_content_id, "coin_prices", "coin_prices", "up")
  │    └─ api.js: request("POST", "/api/feedback", { daily_content_id, section_type, content_item_id, vote })
  │         └─ fetch(BASE_URL + "/api/feedback", { method: "POST", headers: { Authorization: "Bearer <token>" }, body: JSON })
  │
  ├─ FastAPI backend receives POST /api/feedback
  │    └─ routes/feedback.py: post_feedback(req, db, current_user)
  │         ├─ Depends(get_current_user) → deps.py → decode_access_token → user_repository.get_by_id → User ORM object
  │         ├─ Depends(get_db) → database.py SessionLocal()
  │         └─ feedback_service.submit_feedback(db, user, req)
  │              ├─ daily_content_repository.get_by_id(db, req.daily_content_id)
  │              │    └─ db.query(DailyContent).filter(DailyContent.id == record_id).first()
  │              ├─ ownership check: daily.user_id != user.id → 404
  │              └─ feedback_repository.upsert(db, user_id, daily_content_id, section_type, content_item_id, vote)
  │                   ├─ db.query(Feedback).filter_by(...).first()
  │                   ├─ if existing: existing.vote = vote
  │                   │  else: db.add(Feedback(...))
  │                   ├─ db.commit(); db.refresh(existing)
  │                   └─ return Feedback ORM object
  │         └─ FeedbackResponse.model_validate(record) → { id, section_type, content_item_id, vote }
  │
  └─ HTTP 200 JSON → VoteButtons: setVoted("up"), setJustSaved(true)
```

### Layered Architecture

```
routes/          ← HTTP only: parse request, call service, return response
services/        ← Business logic: validation, orchestration, external API calls
repositories/    ← DB queries only: SQLAlchemy ORM operations
models/          ← SQLAlchemy table definitions
schemas/         ← Pydantic request/response validation
core/            ← Config, DB session factory, security, FastAPI dependencies
utils/           ← Fallback data; no business logic
```

### Frontend Layer

```
pages/           ← Full screens: LoginPage, SignupPage, OnboardingPage, DashboardPage, PreferencesPage
components/      ← Reusable UI: Navbar, VoteButtons, ProtectedRoute, PublicRoute
services/        ← API calls: api.js wrapper, authApi, dashboardApi, feedbackApi, onboardingApi
context/         ← Shared state: AuthContext (user, loading, storeLogin, logout)
```

---

## 2. Authentication & JWT Flow

### Signup flow

1. `SignupPage.jsx` calls `register(name, email, password)` from `authApi.js`.
2. `authApi.js` calls `api.post("/api/auth/register", { name, email, password })`.
3. `routes/auth.py` receives the request; `auth_service.register(db, req)` is called.
4. `auth_service.register` checks for duplicate email via `user_repository.get_by_email`; raises HTTP 409 if found.
5. `security.hash_password(req.password)` hashes the password with bcrypt via `passlib.CryptContext`.
6. `user_repository.create(db, name, email, hashed_password)` inserts a row into the `users` table.
7. `security.create_access_token(user.id)` creates a JWT with payload `{"sub": str(user.id), "exp": <UTC timestamp>}` signed with `SECRET_KEY` using `HS256`.
8. `TokenResponse(access_token=token)` is returned as JSON with HTTP 201.
9. Frontend stores `access_token` in `localStorage` under key `token`.
10. Frontend calls `getMe()` to fetch `{ id, name, email }` and stores it in `AuthContext` via `storeLogin(token, userData)`.

### Login flow

Same as signup except: `auth_service.login` calls `verify_password(plain, hashed)` using `passlib.verify`. Returns HTTP 401 with detail `"Invalid email or password"` if either the email is not found or the password does not match.

### JWT contents

The JWT payload has exactly two claims:
- `sub`: the user's integer `id` stored as a string (e.g., `"7"`)
- `exp`: UTC expiry timestamp, set to `now + ACCESS_TOKEN_EXPIRE_MINUTES` (default: 60 minutes)

No additional claims (email, name, roles) are embedded. The user record is always re-fetched from the database on each protected request.

### JWT validation on every protected request

1. `HTTPBearer(auto_error=False)` is instantiated as `bearer_scheme` in `deps.py`.
2. FastAPI injects `credentials: HTTPAuthorizationCredentials | None` into `get_current_user`.
3. If `credentials is None` → raise HTTP 401 with `WWW-Authenticate: Bearer` header.
4. `decode_access_token(credentials.credentials)` uses `jose.jwt.decode` with `SECRET_KEY` and `algorithms=["HS256"]`; returns `int(payload["sub"])` or `None` on any `JWTError`.
5. If `user_id is None` → raise HTTP 401 `"Invalid or expired token"`.
6. `user_repository.get_by_id(db, user_id)` fetches the user row. If the user was deleted → HTTP 401.
7. Returns the `User` ORM object, which is injected into the route handler as `current_user`.

### Why `auto_error=False`

With `auto_error=True` (the default), FastAPI's `HTTPBearer` raises HTTP **403** at the Starlette middleware layer when the `Authorization` header is missing or malformed. This is the wrong status code for a missing credential. Setting `auto_error=False` makes `HTTPBearer` return `None` instead, allowing `get_current_user` to raise HTTP **401** with the correct `WWW-Authenticate: Bearer` header as required by RFC 6750.

---

## 3. Dashboard Caching Flow

### GET /api/dashboard full flow

```
dashboard_service.get_dashboard(db, user_id)
  │
  ├─ preference_repository.get_by_user_id(db, user_id)
  │    └─ None → HTTP 428 "Onboarding not completed"
  │
  ├─ assets = pref.interested_assets.split(",")   # e.g. ["BTC", "ETH"]
  ├─ today = date.today()
  │
  ├─ daily_content_repository.get_by_user_and_date(db, user_id, today)
  │    └─ Cache HIT (record exists AND all four fields non-null):
  │         ├─ json.loads(cached.coin_prices), json.loads(cached.market_news)
  │         ├─ cached.ai_insight (plain text)
  │         ├─ json.loads(cached.meme)
  │         ├─ _infer_data_sources(coin_prices, market_news, ai_insight) → DataSources
  │         └─ return DashboardResponse(daily_content_id=cached.id, ...)
  │
  └─ Cache MISS:
       ├─ coin_service.get_coin_prices(assets)     → (list[dict], "live"|"fallback")
       ├─ news_service.get_news()                  → (list[dict], "live"|"fallback")
       ├─ ai_service.get_ai_insight(assets, type)  → (str, "live"|"fallback")
       ├─ fallback_data.get_meme()                 → dict (always static)
       ├─ daily_content_repository.upsert(db, user_id, today, ...)
       │    └─ JSON-serializes all four sections into Text columns
       └─ return DashboardResponse(daily_content_id=record.id, ...)
```

### Cache invalidation on preference change

`onboarding_service.save_preferences` calls `daily_content_repository.delete_by_user_and_date(db, user_id, date.today())` after successfully updating `user_preferences`. This deletes the current day's `DailyContent` row. Because `feedback.daily_content_id` has `ondelete="CASCADE"`, all feedback votes for that day are also deleted. The next `GET /api/dashboard` call finds no cached record and fetches fresh data with the new asset selection.

### How `data_sources` labels are inferred from cached data

The `_infer_data_sources` function in `dashboard_service.py` applies three heuristics to reconstruct which provider generated each section without storing the label:

- **coin_prices**: CoinGecko live data sets `name == symbol` (e.g., `"name": "BTC", "symbol": "BTC"`). Fallback data uses full names (`"name": "Bitcoin"`). Check: `coin_prices[0].get("name") == coin_prices[0].get("symbol")`.
- **market_news**: All fallback articles have `"source": "Demo Content"`. Live NewsData.io articles always have a real source name (e.g., `"CoinDesk"`). Check: `market_news[0].get("source") != "Demo Content"`.
- **ai_insight**: Every live response passes through `_normalise()`, which strips duplicate disclaimers and appends exactly one `"This is not financial advice."`. Static fallback strings do not end with this. Check: `ai_insight.strip().endswith("This is not financial advice.")`.

The `meme` field is always `"static_json"` — it is hardcoded in the `DataSources` Pydantic model as a default literal.

---

## 4. External API Fallback Chain

### CoinGecko (coin_service.py)

- **What it does**: Fetches USD price and 24h change for the user's selected assets using `GET /api/v3/simple/price`.
- **Key detail**: Works without an API key on the free public tier. If `COINGECKO_API_KEY` is set, it is sent as the `x-cg-demo-api-key` header.
- **Symbol mapping**: `_SYMBOL_TO_ID` maps user-facing symbols (e.g., `"BTC"`) to CoinGecko IDs (e.g., `"bitcoin"`). The `_normalize_assets` function accepts either a list or comma-separated string.
- **Live response quirk**: The `/simple/price` endpoint does not return full coin names, so live data sets `name == symbol` (both `"BTC"`). This is the heuristic used by `_infer_data_sources`.
- **Fallback triggers**: Any `Exception` (network error, HTTP 4xx/5xx, JSON parse failure, timeout of 8.0 s). Per-coin fallback is used when a specific symbol is missing from an otherwise successful response.
- **Returns**: `(list[dict], "live")` on success, `(fallback_data.get_coin_prices(assets), "fallback")` on any failure.

### NewsData.io (news_service.py)

- **What it does**: Fetches the 5 most recent crypto news articles from `https://newsdata.io/api/1/latest` with `q=cryptocurrency OR bitcoin OR ethereum&language=en&size=5`.
- **Key detail**: Requires `NEWSDATA_API_KEY`. If the key is absent (empty string), the function returns fallback immediately without making any HTTP request.
- **Article ID format**: Each article gets an `id` of `f"nd-{post.get('article_id', i)}"`.
- **Summary field**: Populated from `description`; falls back to `title` if `description` is `None` (can happen on the free tier).
- **Fallback triggers**: Missing key, any `Exception`, or an empty `results` list in the response.
- **Returns**: `(list[dict], "live")` on success, `(fallback_data.get_news(), "fallback")` otherwise.

### OpenRouter (ai_service.py — first tier)

- **What it does**: Sends a personalized prompt to `https://openrouter.ai/api/v1/chat/completions` using one of four free-tier models in order.
- **Model list** (`_OPENROUTER_MODELS`): `liquid/lfm-2.5-1.2b-instruct:free`, `meta-llama/llama-3.2-3b-instruct:free`, `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-v4-flash:free`.
- **Required headers**: `HTTP-Referer: https://ai-crypto-advisor.app` and `X-Title: AI Crypto Advisor` are required by OpenRouter's free-tier policy.
- **Prompt structure**: Instructs the model to give a 2-sentence observation for the user's investor type and assets. Explicitly forbids "buying opportunity", "sell now", "buy now". Requires the response to end with `"This is not financial advice."`.
- **`_normalise(raw)`**: Strips any lines that exactly equal `_DISCLAIMER`, joins the rest, then appends exactly one disclaimer. Prevents the model from echoing the disclaimer twice.
- **`_try_openrouter_model`**: Returns normalised content string or `None`. Logs HTTP status and error message on failure without logging the API key.
- **Fallback triggers**: Missing key, HTTP non-200 from all models, empty choices, empty content, any `Exception`.

### Hugging Face (ai_service.py — second tier)

- **What it does**: Calls `https://router.huggingface.co/v1/chat/completions` with an OpenAI-compatible interface.
- **Key detail**: Requires `HUGGINGFACE_API_KEY`. Model is configured via `HUGGINGFACE_MODEL` (default: `"Qwen/Qwen2.5-7B-Instruct"`).
- **Fallback triggers**: Missing key, HTTP non-200, empty content, any `Exception`.
- **Returns**: Normalised insight string or `None`.

### Static fallback (ai_service.py — third tier)

- **What it does**: `fallback_data.get_ai_insight()` returns a random choice from a list of 6 pre-written insight strings.
- **Always succeeds**: Cannot fail. Returns `(insight_text, "fallback")`.

### Meme (always static)

- `fallback_data.get_meme()` returns a random entry from `_MEMES` (6 entries). No external API is ever called for memes. The `DataSources.meme` field is permanently `"static_json"`.

---

## 5. Feedback Storage Design

### Unique constraint

The `feedback` table has constraint `uq_feedback_vote` on columns `(user_id, daily_content_id, section_type, content_item_id)`. This means: one vote per user, per day's snapshot, per section, per content item. Re-voting the same section updates the existing row rather than inserting a duplicate.

### Upsert pattern in feedback_repository.py

The `upsert` function uses query-then-update:
1. `db.query(Feedback).filter_by(user_id=..., daily_content_id=..., section_type=..., content_item_id=...).first()`
2. If a row exists: `existing.vote = vote` (mutate in place).
3. If no row: `db.add(Feedback(...))`.
4. `db.commit(); db.refresh(existing)` in both cases.
5. Returns the `Feedback` ORM object.

This approach reads before writing. The database unique constraint serves as a safety net if two concurrent requests slip through the application-level check.

### Why daily_content_id instead of embedding content

`feedback` references `daily_content.id` rather than embedding the full content payload. This means:
- The `feedback` table stores only the vote metadata: who voted (`user_id`), on what snapshot (`daily_content_id`), on which section (`section_type`), on which item (`content_item_id`), and what they chose (`vote`).
- The actual content (article titles, prices, AI text) is always available in `daily_content` by joining on `id`.
- A future recommendation model can read `feedback` rows joined to `daily_content` to understand which content each user liked or disliked.

### What content_item_id is set to

In the current MVP, `content_item_id` is set to the same value as `section_type` (e.g., `"coin_prices"` for the prices section). This means the granularity is one vote per section per day. The `getContentItemId` function in `DashboardPage.jsx` uses `dashboard?.meme?.id` for the meme section (e.g., `"meme-003"`) and falls back to `SECTION_TYPE[sectionKey]` for all other sections. The unique constraint still works correctly because `section_type + content_item_id` together identify the voted item.

---

## 6. Frontend Auth Flow

```
App.jsx
  └─ <AuthProvider>        ← wraps entire tree; mounts useEffect once
       │
       ├─ localStorage.getItem("token")
       │    ├─ null → setLoading(false); user stays null
       │    └─ token found → getMe() [GET /api/auth/me]
       │         ├─ success → setUser(userData); setLoading(false)
       │         └─ error   → localStorage.removeItem("token"); setLoading(false)
       │
       ├─ exposes: { user, loading, storeLogin, logout }
       │
       ├─ ProtectedRoute: if loading → spinner; if !user → <Navigate to="/login">; else → children
       └─ PublicRoute:    if loading → spinner; if user  → <Navigate to="/dashboard">; else → children
```

Routes:
- `/login`, `/signup` → wrapped in `PublicRoute`: authenticated users are redirected to `/dashboard`.
- `/onboarding`, `/dashboard`, `/preferences` → wrapped in `ProtectedRoute`: unauthenticated users are redirected to `/login`.
- `*` → `<Navigate to="/login" replace />`.

Login routing logic: after a successful login, `LoginPage.jsx` calls `getPreferences()`. If it returns 200 (preferences exist), navigate to `/dashboard`. If it throws (404, no preferences), navigate to `/onboarding`. This is the sole mechanism for routing returning users correctly.

---

## 7. Docker & Deployment Structure

### Docker Compose services

```
postgres:
  image: postgres:15
  ports: 5433:5432          ← host 5433 avoids conflicts with local Postgres
  healthcheck: pg_isready   ← backend will not start until this passes
  volumes: postgres_data    ← named volume for persistence

backend:
  build: ./backend          ← python:3.11-slim Dockerfile
  depends_on: postgres (condition: service_healthy)
  command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"
  env_file: ./backend/.env  ← loads API keys (OPENROUTER_API_KEY, etc.)
  environment:              ← overrides .env for Docker-specific values (DATABASE_URL uses "postgres" hostname)

frontend:
  build: ./frontend         ← node:20-alpine Dockerfile
  depends_on: backend       ← waits for backend service to start (not health)
  ports: 5173:5173
  volumes: ./frontend:/app  ← bind mount for hot reload
  /app/node_modules         ← anonymous volume keeps container's node_modules
  VITE_API_BASE_URL: http://localhost:8000   ← host-visible URL (React runs in browser, not container)
```

### Why DATABASE_URL uses "postgres" as hostname in Docker

Inside Docker Compose, container-to-container networking uses service names as hostnames. The backend container connects to `postgresql://postgres:postgres@postgres:5432/crypto_advisor` where `postgres` is the service name. The local `.env` uses `localhost:5433`. The docker-compose `environment` block overrides the `.env` value for the Docker context.

### Vercel SPA routing

`frontend/vercel.json` contains a rewrite rule that maps all paths to `/index.html`. Without this, navigating directly to `/dashboard` or refreshing the page returns Vercel's own 404 because there is no static file at that path. The rewrite ensures React Router handles all client-side routes.

### Render deployment

The backend `command` in docker-compose (`alembic upgrade head && uvicorn ...`) mirrors what is needed on Render: the Start Command is set to `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`. Environment variables are set in the Render dashboard. The `CORS_ORIGINS` variable must include the deployed Vercel frontend URL.

---

## File-by-File Reference

---

## backend/app/main.py

**Layer:** Core

**Purpose:** Creates and configures the FastAPI application instance, registers all routers, adds CORS middleware, and checks for insecure SECRET_KEY values on startup.

**Key exports / public API:**
- `app` — the FastAPI application instance imported by uvicorn

**Function-by-function breakdown:**

### `lifespan(app: FastAPI)` (async context manager)
- **What it does:** Checks whether `settings.SECRET_KEY` matches either known placeholder value (`"change-me-to-a-long-random-string"` or `"change-me-in-production"`). If so, emits a `WARNING` log. The `yield` separates startup from shutdown logic; there is no shutdown logic currently.
- **Inputs:** `app` — the FastAPI instance (unused inside the function body).
- **Returns:** An async generator used by FastAPI as a lifespan context manager.
- **Called by:** FastAPI framework at startup.
- **Calls:** `logger.warning(...)` conditionally.
- **Key decision:** The app does not crash on a placeholder key — it only warns. This keeps local development working without requiring a proper key.

### `health_check() -> dict`
- **What it does:** Returns `{"status": "ok"}`. Used by load balancers, uptime monitors, and the Docker healthcheck pattern.
- **Inputs:** None.
- **Returns:** `{"status": "ok"}`.
- **Called by:** Any HTTP client hitting `GET /health`.
- **Calls:** Nothing.
- **Key decision:** No authentication required; intentionally public.

**Interview Q&A:**

**Q: Why is the SECRET_KEY check done in a `lifespan` context manager instead of at module load time?**
A: FastAPI's `lifespan` parameter replaced the deprecated `on_event("startup")` pattern. Using `lifespan` ensures the warning appears in the server log at the same point in the startup sequence regardless of how the app is launched (uvicorn, pytest, etc.). Module-level code runs at import time, which can fire in unexpected contexts like test collection.

**Q: Why does the `app.add_middleware(CORSMiddleware)` use `settings.CORS_ORIGINS` instead of a wildcard?**
A: CORS origins are read from the `CORS_ORIGINS` environment variable (a JSON list of strings). In Docker Compose this is set to `'["http://localhost:5173"]'`. In production, the Vercel frontend URL is added. Using an explicit list prevents cross-origin requests from arbitrary domains while remaining configurable without code changes.

---

## backend/app/core/config.py

**Layer:** Core

**Purpose:** Defines the `Settings` class using `pydantic-settings`, which reads environment variables and `.env` files into typed, validated Python attributes.

**Key exports / public API:**
- `settings` — singleton `Settings` instance imported by all modules that need configuration

**Function-by-function breakdown:**

### `class Settings(BaseSettings)`
- **What it does:** Declares all application configuration as typed class attributes with defaults. `pydantic-settings` automatically reads matching environment variables (case-insensitive) and falls back to the declared default if the variable is absent.
- **Inputs:** Environment variables and the `.env` file at the working directory.
- **Returns:** A `Settings` instance.
- **Called by:** Every module that imports `settings`.
- **Calls:** `pydantic_settings.BaseSettings` internals.
- **Key decision:** `model_config = SettingsConfigDict(env_file=".env", extra="ignore")` — `extra="ignore"` means unknown environment variables do not cause a validation error, which is important when running in cloud environments that inject many variables.

**Key fields:**
- `SECRET_KEY: str` — used to sign and verify JWTs. Default is a placeholder that triggers the lifespan warning.
- `CORS_ORIGINS: list[str]` — parsed from a JSON array string in the environment.
- `DATABASE_URL: str` — PostgreSQL connection string.
- `JWT_ALGORITHM: str = "HS256"` — passed to `jose.jwt.encode` and `jose.jwt.decode`.
- `ACCESS_TOKEN_EXPIRE_MINUTES: int = 60` — added to `datetime.now(timezone.utc)` in `create_access_token`.
- `COINGECKO_API_KEY`, `NEWSDATA_API_KEY`, `OPENROUTER_API_KEY`, `HUGGINGFACE_API_KEY` — all default to empty string `""`. An empty string is treated as "key not configured, use fallback".
- `HUGGINGFACE_MODEL: str = "Qwen/Qwen2.5-7B-Instruct"` — configurable without code changes.

**Interview Q&A:**

**Q: How does an empty string for API keys enable the fallback pattern?**
A: The services check `if not settings.NEWSDATA_API_KEY:` (and equivalents). An empty string is falsy in Python, so no key configured means the `if` branch is taken and fallback data is returned immediately without making an HTTP request. This avoids unnecessary network calls and auth errors.

**Q: Why use pydantic-settings instead of `os.environ.get()`?**
A: `pydantic-settings` provides type coercion (e.g., `CORS_ORIGINS` is automatically parsed from a JSON string into `list[str]`), validation (a non-integer `ACCESS_TOKEN_EXPIRE_MINUTES` raises at startup, not at call time), a single source of truth for all config, and automatic `.env` file loading.

---

## backend/app/core/database.py

**Layer:** Core

**Purpose:** Creates the SQLAlchemy engine and session factory, defines the declarative `Base` class shared by all ORM models, and provides the `get_db` FastAPI dependency.

**Key exports / public API:**
- `engine` — SQLAlchemy engine used by Alembic
- `SessionLocal` — session factory used by `get_db`
- `Base` — `DeclarativeBase` subclass imported by all models
- `get_db` — FastAPI dependency that yields a database session

**Function-by-function breakdown:**

### `get_db() -> Generator[Session, None, None]`
- **What it does:** Opens a `SessionLocal()` session, yields it to the route handler, and closes it in a `finally` block regardless of whether the handler raised an exception.
- **Inputs:** None (called by FastAPI's dependency injection).
- **Returns:** Yields a `sqlalchemy.orm.Session`.
- **Called by:** All route handlers via `Depends(get_db)`.
- **Calls:** `SessionLocal()`, `db.close()`.
- **Key decision:** `autocommit=False` — explicit `db.commit()` calls are required in repositories. This ensures transactions are committed only after all writes succeed.

**Engine configuration:**
- `pool_pre_ping=True` — before handing a connection from the pool to a route, SQLAlchemy sends a lightweight ping. If the connection was dropped (e.g., Postgres restarted), the pool silently replaces it rather than letting the handler fail with a `OperationalError`.

**Interview Q&A:**

**Q: What is the purpose of `pool_pre_ping=True`?**
A: It prevents stale connection errors in long-running deployments. Without it, a connection that has been idle long enough to be closed by the server would raise an `OperationalError` on the first query. `pool_pre_ping=True` detects dead connections before they are used and replaces them transparently.

**Q: Why does `get_db` use a `try/finally` instead of a `try/except`?**
A: The route handler may raise an `HTTPException` (which FastAPI converts to a response) or any other exception. The session must be closed in either case to return the connection to the pool. `finally` runs unconditionally, ensuring no connection leak. The exception propagates normally because it is not caught.

---

## backend/app/core/security.py

**Layer:** Core

**Purpose:** Implements password hashing with bcrypt and JWT creation/decoding with python-jose.

**Key exports / public API:**
- `hash_password(plain: str) -> str`
- `verify_password(plain: str, hashed: str) -> bool`
- `create_access_token(subject: int) -> str`
- `decode_access_token(token: str) -> int | None`

**Function-by-function breakdown:**

### `hash_password(plain: str) -> str`
- **What it does:** Hashes a plaintext password using bcrypt via `passlib.CryptContext`. Automatically generates a random salt and embeds it in the hash output.
- **Inputs:** `plain` — the raw password string from the registration request.
- **Returns:** A bcrypt hash string (starts with `$2b$`).
- **Called by:** `auth_service.register`.
- **Calls:** `pwd_context.hash(plain)`.
- **Key decision:** Passlib is pinned to `bcrypt==3.2.2` because `passlib 1.7.4` is incompatible with `bcrypt >= 4.0` (the newer bcrypt raises `ValueError` for long passwords during internal validation).

### `verify_password(plain: str, hashed: str) -> bool`
- **What it does:** Verifies a plaintext password against the stored bcrypt hash.
- **Inputs:** `plain` — the submitted password; `hashed` — the value from `users.hashed_password`.
- **Returns:** `True` if the password matches, `False` otherwise.
- **Called by:** `auth_service.login`.
- **Calls:** `pwd_context.verify(plain, hashed)`.
- **Key decision:** Passlib handles timing-safe comparison internally.

### `create_access_token(subject: int) -> str`
- **What it does:** Creates a signed JWT. The payload is `{"sub": str(subject), "exp": <UTC expiry>}`. The token is signed with `settings.SECRET_KEY` using `settings.JWT_ALGORITHM` (HS256).
- **Inputs:** `subject` — the user's integer `id`.
- **Returns:** A signed JWT string.
- **Called by:** `auth_service.register`, `auth_service.login`.
- **Calls:** `datetime.now(timezone.utc)`, `jwt.encode(...)`.
- **Key decision:** `sub` is stored as a string (`str(subject)`) because the JWT spec defines `sub` as a string claim. It is converted back to `int` in `decode_access_token`.

### `decode_access_token(token: str) -> int | None`
- **What it does:** Decodes and validates a JWT. Returns the integer user ID from `sub` on success, or `None` if the token is invalid, expired, or malformed.
- **Inputs:** `token` — the raw JWT string from the `Authorization` header.
- **Returns:** `int` user ID or `None`.
- **Called by:** `deps.get_current_user`.
- **Calls:** `jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])`.
- **Key decision:** Catches all `JWTError` subclasses (expired, invalid signature, malformed) and returns `None` uniformly. The caller (`get_current_user`) then raises the appropriate HTTP 401.

**Interview Q&A:**

**Q: Why is the user ID stored as a string in the JWT `sub` claim?**
A: The JWT specification (RFC 7519) defines `sub` as a StringOrURI, not an integer. `python-jose` will encode it either way, but using a string is spec-compliant and avoids type confusion between libraries. `decode_access_token` calls `int(user_id)` to convert it back.

**Q: What happens if someone sends a JWT signed with a different SECRET_KEY?**
A: `jose.jwt.decode` raises `JWTError` because the HMAC signature verification fails. `decode_access_token` catches `JWTError` and returns `None`. `get_current_user` then raises HTTP 401 with detail `"Invalid or expired token"`.

---

## backend/app/core/deps.py

**Layer:** Core

**Purpose:** Provides the `get_current_user` FastAPI dependency that extracts, validates, and resolves a JWT to a `User` ORM object for injection into protected route handlers.

**Key exports / public API:**
- `get_current_user` — FastAPI dependency function

**Function-by-function breakdown:**

### `get_current_user(credentials, db) -> User`
- **What it does:** Three-stage validation: (1) check credentials are present, (2) decode the JWT to get user_id, (3) fetch the user from the database. Raises HTTP 401 at each failure stage with appropriate detail messages and `WWW-Authenticate: Bearer` header.
- **Inputs:** `credentials: HTTPAuthorizationCredentials | None` injected by `bearer_scheme`; `db: Session` injected by `get_db`.
- **Returns:** A `User` ORM model instance.
- **Called by:** All protected route handlers via `Depends(get_current_user)`.
- **Calls:** `decode_access_token(credentials.credentials)`, `user_repository.get_by_id(db, user_id)`.
- **Key decision:** `HTTPBearer(auto_error=False)` is used so that a missing `Authorization` header results in `credentials=None` rather than an automatic HTTP 403, allowing this function to raise the correct HTTP 401.

**Interview Q&A:**

**Q: Why is there a separate `_UNAUTHORIZED` constant for the "not authenticated" case but inline `HTTPException` for the other two cases?**
A: The "no credentials at all" case (missing Authorization header) is the most common unauthenticated case and has no variable message, so extracting it as a module-level constant avoids re-creating the same exception object on every request. The other two cases have different detail strings and occur less frequently, so inline construction is cleaner.

**Q: If a user is deleted from the database but their JWT has not yet expired, what happens?**
A: `user_repository.get_by_id(db, user_id)` returns `None`. `get_current_user` raises HTTP 401 with detail `"User not found"`. The JWT is otherwise technically valid but the application correctly denies access because the user no longer exists.

---

## backend/app/models/user.py

**Layer:** Model

**Purpose:** Defines the `users` PostgreSQL table using SQLAlchemy's `DeclarativeBase` mapped-column syntax.

**Key exports / public API:**
- `User` — ORM model class

**Function-by-function breakdown:**

### `class User(Base)`
- **What it does:** Maps to the `users` table. Columns: `id` (PK, auto-increment), `name` (String 100), `email` (String 255, unique), `hashed_password` (String 255), `created_at` (timezone-aware DateTime, server default `now()`), `updated_at` (timezone-aware DateTime, server default `now()`, `onupdate=func.now()`).
- **`__table_args__`:** `Index("ix_users_email", "email")` — creates an explicit named index on `email`. The `unique=True` on the column definition also creates a unique constraint; the explicit index is added for query performance on `GET /api/auth/login` which filters by email.
- **Key decision:** `hashed_password` is named `hashed_password` (not `password`) to make it self-documenting that a hash is stored, never the raw value.

**Interview Q&A:**

**Q: Why does the `User` model have both a `UniqueConstraint` on `email` and an explicit `Index("ix_users_email", "email")`?**
A: The `unique=True` parameter on the column creates a unique constraint (which PostgreSQL implements as a unique index). The `Index("ix_users_email", "email")` creates an additional named index. This is technically redundant — the unique constraint's index is already used for lookups — but the named index appears explicitly in `alembic/versions/7e926063c2cd_create_initial_tables.py` alongside `op.create_index('ix_users_email', ...)`, making the migration script self-evident.

**Q: What does `server_default=func.now()` do vs. setting a Python default?**
A: `server_default` delegates the default value to the database server (`NOW()` in PostgreSQL). This means the timestamp is set by the DB when the row is inserted, independent of the application server's clock. A Python-level `default=datetime.utcnow` would use the application clock, which could differ in distributed deployments.

---

## backend/app/models/preference.py

**Layer:** Model

**Purpose:** Defines the `user_preferences` table, which stores one row per user containing their onboarding answers.

**Key exports / public API:**
- `UserPreference` — ORM model class

**Function-by-function breakdown:**

### `class UserPreference(Base)`
- **What it does:** Maps to the `user_preferences` table. Columns: `id` (PK), `user_id` (FK → `users.id`, unique, cascade delete), `interested_assets` (String 500, comma-separated), `investor_type` (String 50), `content_types` (String 200, comma-separated), `created_at`, `updated_at`.
- **Storage format:** Arrays are stored as comma-separated strings (e.g., `"BTC,ETH,SOL"`). Serialization into a list happens in `onboarding_service._to_response` via `.split(",")`. This avoids the need for a PostgreSQL `ARRAY` type or a separate join table for an MVP.
- **`user_id` unique constraint:** Enforces the one-preference-record-per-user invariant at the database level. The service-layer upsert pattern (check-then-create-or-update) handles the application logic.
- **Cascade delete:** `ForeignKey("users.id", ondelete="CASCADE")` — deleting a user automatically deletes their preferences row.

**Interview Q&A:**

**Q: Why store interested_assets as a comma-separated string instead of a PostgreSQL ARRAY or JSONB?**
A: This is an MVP simplicity trade-off. Comma-separated strings work with any SQL database (including SQLite for testing), require no special PostgreSQL type handling, and are trivially serialized/deserialized in Python. The values are read-only after storage (never filtered by individual asset in a SQL query), so there is no query-performance reason to use ARRAY or JSONB.

---

## backend/app/models/daily_content.py

**Layer:** Model

**Purpose:** Defines the `daily_content` table, which serves as the dashboard cache — one row per user per calendar day.

**Key exports / public API:**
- `DailyContent` — ORM model class

**Function-by-function breakdown:**

### `class DailyContent(Base)`
- **What it does:** Maps to the `daily_content` table. Columns: `id` (PK), `user_id` (FK → `users.id`, cascade delete), `date` (PostgreSQL `Date`), `market_news` (Text, nullable), `coin_prices` (Text, nullable), `ai_insight` (Text, nullable), `meme` (Text, nullable), `created_at`.
- **Unique constraint:** `UniqueConstraint("user_id", "date", name="uq_daily_content_user_date")` — prevents two cache rows for the same user on the same day.
- **JSON storage:** `market_news`, `coin_prices`, and `meme` store JSON-serialized Python lists/dicts (via `json.dumps` in the repository). `ai_insight` stores plain text.
- **Nullable columns:** All four content columns are nullable, allowing a row to be created partially (though in practice the service always writes all four).
- **No `updated_at`:** The cache is either created fresh or deleted and recreated; there is no partial update path.

**Interview Q&A:**

**Q: Why does `daily_content` use a `Date` column instead of storing a `DateTime`?**
A: The caching granularity is one snapshot per calendar day. Using `Date` (without time) makes the uniqueness check (`user_id + date`) unambiguous regardless of timezone or time of day. A `DateTime` would require truncating to midnight, which introduces timezone complexity.

**Q: What happens to `feedback` rows when a `daily_content` row is deleted?**
A: The `feedback.daily_content_id` foreign key is defined with `ondelete="CASCADE"`. Deleting a `daily_content` row automatically deletes all `feedback` rows that reference it. This occurs when `onboarding_service.save_preferences` calls `delete_by_user_and_date` — votes cast earlier in the same day are lost when preferences change.

---

## backend/app/models/feedback.py

**Layer:** Model

**Purpose:** Defines the `feedback` table, which stores individual thumbs-up/thumbs-down votes tied to a specific daily content snapshot.

**Key exports / public API:**
- `Feedback` — ORM model class

**Function-by-function breakdown:**

### `class Feedback(Base)`
- **What it does:** Maps to the `feedback` table. Columns: `id` (PK), `user_id` (FK → `users.id`, cascade delete), `daily_content_id` (FK → `daily_content.id`, cascade delete), `section_type` (String 20), `content_item_id` (String 100), `vote` (String 4), `created_at`.
- **Unique constraint:** `UniqueConstraint("user_id", "daily_content_id", "section_type", "content_item_id", name="uq_feedback_vote")` — enforces one vote per user per snapshot per content item.
- **`vote` column:** `String(4)` stores either `"up"` or `"down"`. The 4-character limit is tight; Pydantic `Literal["up", "down"]` in the schema prevents any other value from reaching the DB.
- **No `updated_at`:** The `vote` field is updated in place by the repository upsert. Adding `updated_at` would require either a trigger or explicit `onupdate`, which was skipped for MVP simplicity.

**Interview Q&A:**

**Q: Why is `content_item_id` a `String(100)` rather than an integer foreign key into a content items table?**
A: Content items (news articles, coins, the AI insight, the meme) are not stored as individual rows in a relational table — they are embedded as JSON in `daily_content`. There is no table to reference. Using a string identifier (like `"coin_prices"` or `"meme-003"`) allows the feedback system to tag specific items within the JSON blob without requiring a normalized content schema.

**Q: What does the `uq_feedback_vote` constraint protect against?**
A: It prevents a user from voting twice on the same section in the same daily snapshot. Without it, rapid double-clicks or concurrent requests could insert two rows. The application-level upsert in `feedback_repository.upsert` is the primary guard; the constraint is the database-level safety net.

---

## backend/app/schemas/auth.py

**Layer:** Schema

**Purpose:** Pydantic models for the authentication endpoints — request bodies and response shapes.

**Key exports / public API:**
- `RegisterRequest` — body for `POST /api/auth/register`
- `LoginRequest` — body for `POST /api/auth/login`
- `TokenResponse` — response from register and login
- `UserResponse` — response from `GET /api/auth/me`

**Function-by-function breakdown:**

### `class RegisterRequest(BaseModel)`
- **What it does:** Validates signup input. `name_not_empty` strips whitespace and rejects blank names. `password_min_length` rejects passwords shorter than 6 characters. `email` uses Pydantic's `EmailStr` for format validation.
- **Key decision:** Validators are `@classmethod` with `@field_validator` (Pydantic v2 syntax). They run on the raw value before it reaches the service layer.

### `class TokenResponse(BaseModel)`
- **What it does:** Wraps the JWT for responses. `token_type` defaults to `"bearer"`.
- **Key decision:** Does not include expiry time. The client assumes the token is valid until a 401 is returned.

### `class UserResponse(BaseModel)`
- **What it does:** Returns `id`, `name`, and `email`. Excludes `hashed_password` and timestamps.
- **`model_config = {"from_attributes": True}`:** Enables Pydantic v2 ORM mode — the model can be constructed from a SQLAlchemy ORM object (`User`) by reading attributes instead of dict keys.

**Interview Q&A:**

**Q: Why does `UserResponse` use `from_attributes: True` but `TokenResponse` does not?**
A: `TokenResponse` is constructed explicitly with keyword arguments (`TokenResponse(access_token=token)`) and never needs to read from an ORM object. `UserResponse` is returned from `GET /api/auth/me` where FastAPI serializes the `User` ORM object via the response model — this requires `from_attributes: True` so Pydantic can read SQLAlchemy mapped attributes.

---

## backend/app/schemas/preference.py

**Layer:** Schema

**Purpose:** Pydantic models for onboarding preference requests and responses, including validation of allowed asset symbols, investor types, and content types.

**Key exports / public API:**
- `PreferenceRequest` — body for `POST /api/onboarding/preferences`
- `PreferenceResponse` — response from both GET and POST onboarding endpoints
- `VALID_ASSETS`, `VALID_INVESTOR_TYPES`, `VALID_CONTENT_TYPES` — sets used for validation

**Function-by-function breakdown:**

### `class PreferenceRequest(BaseModel)`
- **What it does:** Validates that `interested_assets` is a non-empty list of known symbols (from `VALID_ASSETS`), `investor_type` is one of five valid strings, and `content_types` is a non-empty list of known types.
- **`validate_assets`:** Computes `set(v) - VALID_ASSETS` to find unknown assets; raises `ValueError` with the invalid entries listed.
- **Key decision:** Using set difference (`invalid = set(v) - VALID_ASSETS`) is more informative than checking each element individually — the error message shows all invalid values at once.

### `class PreferenceResponse(BaseModel)`
- **What it does:** Returns the stored preferences with `interested_assets` and `content_types` as `list[str]` (deserialized from the comma-separated DB storage in `onboarding_service._to_response`).
- **`model_config = {"from_attributes": True}`:** Allows constructing from the `UserPreference` ORM object.

**Interview Q&A:**

**Q: The DB stores assets as a comma-separated string but the API receives and returns a list. Where does the conversion happen?**
A: In `onboarding_service`. The `save_preferences` function calls `",".join(req.interested_assets)` before passing to the repository. The `_to_response` function calls `pref.interested_assets.split(",")` when building `PreferenceResponse`. The schema and repository layers never see the other's format.

---

## backend/app/schemas/dashboard.py

**Layer:** Schema

**Purpose:** Pydantic response models for the dashboard endpoint, including typed models for each content section and a `DataSources` model describing the origin of each section's data.

**Key exports / public API:**
- `CoinPrice`, `NewsArticle`, `Meme` — per-item models
- `DataSources` — per-section source labels
- `DashboardResponse` — the full dashboard response

**Function-by-function breakdown:**

### `class DataSources(BaseModel)`
- **What it does:** Holds a `Literal["live", "fallback"]` label for `coin_prices`, `market_news`, and `ai_insight`. `meme` is always `Literal["static_json"]` with a default — it is not set by the service.
- **Key decision:** Using `Literal` types instead of plain `str` means the Pydantic model will reject any other string value at serialization time. This makes it impossible to accidentally set an undocumented source label.

### `class DashboardResponse(BaseModel)`
- **What it does:** The complete dashboard shape returned by `GET /api/dashboard`. Includes `daily_content_id: int` (needed by the frontend to submit feedback votes), `date`, `investor_type`, `interested_assets`, and the four content sections plus `data_sources`.
- **Key decision:** `daily_content_id` was added specifically to enable the feedback system. Without it, the frontend would have no way to reference the correct cache row when voting.

**Interview Q&A:**

**Q: Why does `DashboardResponse` include `investor_type` and `interested_assets` if they are also available from `GET /api/onboarding/preferences`?**
A: The dashboard response is a single API call. Including preferences data in the response allows the frontend to render the briefing header (investor type pill, tracking asset tags) without making a separate preferences request just for display. The frontend still calls `getPreferences()` separately for section ordering, but the dashboard response is self-contained.

---

## backend/app/schemas/feedback.py

**Layer:** Schema

**Purpose:** Pydantic models for the feedback voting endpoints.

**Key exports / public API:**
- `FeedbackRequest` — body for `POST /api/feedback`
- `FeedbackResponse` — response from `POST /api/feedback`
- `VotesResponse` — response from `GET /api/feedback`

**Function-by-function breakdown:**

### `class FeedbackRequest(BaseModel)`
- **What it does:** Validates the vote payload. `section_type` is `Literal["market_news", "coin_prices", "ai_insight", "meme"]`. `vote` is `Literal["up", "down"]`. Both use Pydantic `Literal` for compile-time and runtime enforcement.
- **Key decision:** `Literal` types on `section_type` and `vote` mean any request with an unexpected value returns HTTP 422 before the route handler runs.

### `class VotesResponse(BaseModel)`
- **What it does:** Returns `votes: dict[str, VoteEntry | None]` — a dict keyed by section type with `VoteEntry` (containing `vote` and `content_item_id`) or `None` for unvoted sections.
- **Key decision:** Always returns all four keys with `None` for unvoted sections rather than omitting them. This simplifies the frontend — it can always do `votes["market_news"]?.vote` without checking key existence.

**Interview Q&A:**

**Q: Why does `FeedbackResponse` use `model_validate(record)` instead of `FeedbackResponse(**record.__dict__)`?**
A: `model_validate` is the Pydantic v2 method for constructing a model from an ORM object (equivalent to v1's `from_orm`). Using `**record.__dict__` would include SQLAlchemy's internal `_sa_instance_state` key and potentially cause errors. `model_validate` uses `from_attributes=True` mode to read only declared field names from ORM attributes.

---

## backend/app/repositories/user_repository.py

**Layer:** Repository

**Purpose:** Database queries for the `users` table — lookup by email, lookup by ID, and creation.

**Key exports / public API:**
- `get_by_email(db, email) -> User | None`
- `get_by_id(db, user_id) -> User | None`
- `create(db, name, email, hashed_password) -> User`

**Function-by-function breakdown:**

### `get_by_email(db: Session, email: str) -> User | None`
- **What it does:** `db.query(User).filter(User.email == email).first()`. Returns the first matching user or `None`.
- **Called by:** `auth_service.register` (duplicate check), `auth_service.login` (credential lookup).
- **Key decision:** Uses `.first()` rather than `.one()` — `.one()` raises `NoResultFound` if missing, requiring a try/except. Returning `None` lets the caller use simple truthiness checks.

### `create(db: Session, name, email, hashed_password) -> User`
- **What it does:** Instantiates a `User` ORM object, adds it to the session, commits, refreshes (to load DB-generated values like `id` and `created_at`), and returns it.
- **Called by:** `auth_service.register`.
- **Key decision:** `db.refresh(user)` after `db.commit()` is necessary because SQLAlchemy's ORM does not automatically populate server-side defaults (`id`, `created_at`) in the Python object after a commit without an explicit refresh or re-query.

**Interview Q&A:**

**Q: Why does the repository receive `hashed_password` instead of the raw password?**
A: The layered architecture assigns password hashing to the service layer (`auth_service`), not the repository. The repository is responsible only for DB operations; it should not contain security logic. Passing the hash keeps the repository simple and reusable.

---

## backend/app/repositories/preference_repository.py

**Layer:** Repository

**Purpose:** Database queries for the `user_preferences` table — lookup by user ID, create, and update.

**Key exports / public API:**
- `get_by_user_id(db, user_id) -> UserPreference | None`
- `create(db, user_id, interested_assets, investor_type, content_types) -> UserPreference`
- `update(db, pref, interested_assets, investor_type, content_types) -> UserPreference`

**Function-by-function breakdown:**

### `update(db, pref, interested_assets, investor_type, content_types) -> UserPreference`
- **What it does:** Mutates the passed `UserPreference` ORM object's attributes in place. Calls `db.commit()` and `db.refresh(pref)`.
- **Inputs:** `pref` — existing ORM object fetched by `get_by_user_id`; three string values (already joined by the service layer).
- **Key decision:** Takes the ORM object rather than a `user_id`. The service already has the object from the preceding `get_by_user_id` call, so passing it avoids a redundant query.

**Interview Q&A:**

**Q: Why does `update` take the ORM object directly instead of fetching it by user_id again?**
A: `onboarding_service.save_preferences` calls `get_by_user_id` first to decide whether to create or update. Passing the fetched object to `update` avoids making a second `SELECT` for the same row. This is a common pattern in SQLAlchemy: load once, pass the object, mutate.

---

## backend/app/repositories/daily_content_repository.py

**Layer:** Repository

**Purpose:** Database operations for the `daily_content` cache table — lookup by ID, lookup by user+date, delete by user+date, and upsert.

**Key exports / public API:**
- `get_by_id(db, record_id) -> DailyContent | None`
- `get_by_user_and_date(db, user_id, target_date) -> DailyContent | None`
- `delete_by_user_and_date(db, user_id, target_date) -> None`
- `upsert(db, user_id, target_date, coin_prices, market_news, ai_insight, meme) -> DailyContent`

**Function-by-function breakdown:**

### `upsert(...) -> DailyContent`
- **What it does:** Calls `get_by_user_and_date` first. If a record exists, updates its JSON columns in place and commits. If not, creates a new `DailyContent` row with `json.dumps` on list/dict arguments and `ai_insight` stored as plain text.
- **Inputs:** Python lists and dicts for the content sections.
- **Returns:** The created or updated `DailyContent` ORM object.
- **Called by:** `dashboard_service.get_dashboard` on cache miss.
- **Key decision:** `json.dumps` is called in the repository, not the service, because the column type (`Text`) requires string values. The repository owns the serialization concern for its table.

### `delete_by_user_and_date(db, user_id, target_date) -> None`
- **What it does:** Calls `get_by_user_and_date`; if found, calls `db.delete(record)` and `db.commit()`. No-op if no record exists.
- **Called by:** `onboarding_service.save_preferences` to invalidate today's cache after a preference change.
- **Key decision:** Uses `db.delete(record)` (ORM delete) rather than a bulk DELETE query. ORM delete fires the cascade correctly for `feedback` rows via SQLAlchemy's event system (in addition to the database-level CASCADE).

**Interview Q&A:**

**Q: Why does `upsert` still have an update branch if `get_dashboard` only calls it on a cache miss?**
A: The update branch is a safety net. If two concurrent requests both pass the cache-miss check before either commits, one will insert and the other will find the existing row and update it rather than failing with a unique constraint violation. It also future-proofs the function if the calling pattern changes.

**Q: Why is `json.dumps` called in the repository instead of the service?**
A: The repository is responsible for knowing how data must be stored in its table. The `DailyContent` columns are `Text`, so they can only hold strings. The service works with Python native types (lists, dicts). The repository is the boundary where Python objects are serialized to the storage format.

---

## backend/app/repositories/feedback_repository.py

**Layer:** Repository

**Purpose:** Database operations for the `feedback` table — upsert a single vote and retrieve all votes for a daily content snapshot.

**Key exports / public API:**
- `get_votes_by_daily_content(db, user_id, daily_content_id) -> dict[str, dict | None]`
- `upsert(db, user_id, daily_content_id, section_type, content_item_id, vote) -> Feedback`

**Function-by-function breakdown:**

### `get_votes_by_daily_content(db, user_id, daily_content_id) -> dict`
- **What it does:** Queries `Feedback.section_type`, `Feedback.content_item_id`, and `Feedback.vote` for all matching rows. Builds a dict keyed by section type. Returns a dict covering all four `_SECTION_TYPES` — sections with no vote get `None`.
- **`_SECTION_TYPES`:** Module-level set `{"market_news", "coin_prices", "ai_insight", "meme"}`. Used to fill in `None` for unvoted sections.
- **Called by:** `feedback_service.get_votes`.
- **Key decision:** Projects only three columns (`section_type`, `content_item_id`, `vote`) rather than fetching full ORM objects. This is more efficient for a read-only summary query.

### `upsert(db, ...) -> Feedback`
- **What it does:** Queries for an existing row matching all four unique-constraint columns. If found, mutates `existing.vote`. If not, inserts a new `Feedback` row. Commits and refreshes in both cases.
- **Called by:** `feedback_service.submit_feedback`.
- **Key decision:** Uses `filter_by(...)` (keyword form) rather than `filter(Model.col == val)` for readability when matching multiple columns with `==`.

**Interview Q&A:**

**Q: Why does `get_votes_by_daily_content` project specific columns instead of returning full `Feedback` ORM objects?**
A: The function needs only three fields for the response. Fetching full ORM objects loads all columns and instantiates ORM objects with full SQLAlchemy state tracking — unnecessary overhead for a read-only summary. Column projection (`db.query(Feedback.section_type, Feedback.content_item_id, Feedback.vote)`) returns lightweight named tuples.

---

## backend/app/services/auth_service.py

**Layer:** Service

**Purpose:** Business logic for user registration and login — duplicate email detection, password hashing, JWT creation.

**Key exports / public API:**
- `register(db, req) -> TokenResponse`
- `login(db, req) -> TokenResponse`

**Function-by-function breakdown:**

### `register(db: Session, req: RegisterRequest) -> TokenResponse`
- **What it does:** Checks for duplicate email (raises HTTP 409 if found), hashes the password, creates the user row, and returns a JWT.
- **Called by:** `routes/auth.py register`.
- **Calls:** `user_repository.get_by_email`, `hash_password`, `user_repository.create`, `create_access_token`.
- **Key decision:** Raises HTTP 409 (Conflict) for duplicate email, not 400 (Bad Request). 409 more accurately describes the state: the request is valid but conflicts with existing data.

### `login(db: Session, req: LoginRequest) -> TokenResponse`
- **What it does:** Fetches user by email. If not found or if `verify_password` returns `False`, raises HTTP 401 with a deliberately vague message (`"Invalid email or password"`) — not specifying whether email or password was wrong prevents user enumeration attacks.
- **Called by:** `routes/auth.py login`.
- **Calls:** `user_repository.get_by_email`, `verify_password`, `create_access_token`.
- **Key decision:** The combined `if not user or not verify_password(...)` check is a single branch that raises the same error regardless of which condition is true.

**Interview Q&A:**

**Q: Why does the login error say "Invalid email or password" instead of specifying which was wrong?**
A: Specifying which field is wrong enables user enumeration — an attacker can determine which email addresses are registered by observing whether the error says "email not found" vs "wrong password". A single vague message prevents this.

**Q: Why is there no rate limiting on the login endpoint in this codebase?**
A: This is an MVP. Rate limiting would typically be implemented as middleware (e.g., `slowapi`) or at the reverse proxy/CDN layer. The current implementation has no protection against brute-force attacks — a known limitation for production deployment.

---

## backend/app/services/onboarding_service.py

**Layer:** Service

**Purpose:** Business logic for reading and writing user preferences, including cache invalidation on preference change.

**Key exports / public API:**
- `get_preferences(db, user_id) -> PreferenceResponse`
- `save_preferences(db, user_id, req) -> PreferenceResponse`

**Function-by-function breakdown:**

### `_to_response(pref) -> PreferenceResponse`
- **What it does:** Converts a `UserPreference` ORM object into a `PreferenceResponse` Pydantic model. Splits `interested_assets` and `content_types` from comma-separated strings into `list[str]`.
- **Called by:** `get_preferences`, `save_preferences`.
- **Key decision:** Private helper (underscore prefix) because no other module should need this conversion.

### `get_preferences(db, user_id) -> PreferenceResponse`
- **What it does:** Fetches the user's `UserPreference` row. Raises HTTP 404 if none exists (used by the frontend to detect unboarded users).
- **Called by:** `routes/onboarding.py get_preferences`.

### `save_preferences(db, user_id, req) -> PreferenceResponse`
- **What it does:** Joins the list fields to comma-separated strings. Checks for an existing preference row — calls `update` if found, `create` if not (upsert pattern). Then deletes today's `daily_content` row for the user to force a cache refresh.
- **Called by:** `routes/onboarding.py save_preferences`.
- **Calls:** `preference_repository.get_by_user_id`, `preference_repository.update` or `preference_repository.create`, `daily_content_repository.delete_by_user_and_date(db, user_id, date.today())`.
- **Key decision:** Cache invalidation is coupled to preference saving, not to dashboard loading. This ensures the stale cache is cleared immediately when preferences change, not lazily.

**Interview Q&A:**

**Q: What is the consequence of deleting today's daily_content after a preference change?**
A: All feedback votes for that day are also deleted (CASCADE). The next dashboard load fetches fresh data using the new asset selection. This is an accepted MVP trade-off — votes cast earlier in the day are lost when preferences change.

---

## backend/app/services/dashboard_service.py

**Layer:** Service

**Purpose:** Orchestrates dashboard assembly — checks the cache, calls external services on a miss, stores the result, and returns a typed response with per-section source labels.

**Key exports / public API:**
- `get_dashboard(db, user_id) -> DashboardResponse`

**Function-by-function breakdown:**

### `_infer_data_sources(coin_prices, market_news, ai_insight) -> DataSources`
- **What it does:** Reconstructs `DataSources` labels from cached content using three heuristics (name==symbol for CoinGecko live, source!="Demo Content" for live news, endswith disclaimer for live AI).
- **Called by:** `get_dashboard` when serving from cache.
- **Key decision:** Not storing the labels in the DB avoids schema changes and keeps the cache format simple. The heuristics are stable because the data generators have consistent properties.

### `get_dashboard(db, user_id) -> DashboardResponse`
- **What it does:** (1) Loads user preferences — HTTP 428 if missing. (2) Checks `daily_content` for a cached record for today. (3) Cache hit: deserializes JSON, infers data sources, returns immediately. (4) Cache miss: calls `coin_service`, `news_service`, `ai_service`, `fallback_data.get_meme()`, upserts the result, returns response with live data sources.
- **Called by:** `routes/dashboard.py get_dashboard`.
- **Calls:** `preference_repository.get_by_user_id`, `daily_content_repository.get_by_user_and_date`, `coin_service.get_coin_prices`, `news_service.get_news`, `ai_service.get_ai_insight`, `fallback_data.get_meme`, `daily_content_repository.upsert`.
- **Key decision:** HTTP 428 (Precondition Required) for missing preferences. This non-standard 4xx code signals "you must complete onboarding first" more precisely than 400 (Bad Request) or 404 (Not Found).

**Interview Q&A:**

**Q: Why is HTTP 428 used for "onboarding not completed" instead of 400 or 403?**
A: HTTP 428 means "Precondition Required" — the server requires the client to fulfill a precondition before the request can proceed. This accurately describes the situation: the user must submit preferences before the dashboard can be generated. It is also distinct from 400 (malformed request) and 403 (forbidden), making it easier to handle specifically in the frontend.

**Q: Why are all four service calls made sequentially rather than concurrently?**
A: The services use synchronous `httpx.Client` (not `httpx.AsyncClient`). FastAPI can run sync endpoints in a thread pool, but within a single synchronous function, I/O is sequential. Using `asyncio.gather` would require making `get_dashboard` async and using `httpx.AsyncClient`. For an MVP with 3-4 external calls per day per user (due to caching), sequential is acceptable.

---

## backend/app/services/coin_service.py

**Layer:** Service

**Purpose:** Fetches live cryptocurrency prices from CoinGecko's public API with per-asset fallback for missing symbols.

**Key exports / public API:**
- `get_coin_prices(assets) -> tuple[list[dict], str]`

**Function-by-function breakdown:**

### `_normalize_assets(assets: Any) -> list[str]`
- **What it does:** Accepts either a list or a comma-separated string, deduplicates, uppercases, strips whitespace, and filters to only symbols present in `_SYMBOL_TO_ID`.
- **Key decision:** Handles the case where a list element might itself contain a comma (e.g., `["BTC,ETH"]`), splitting it. This defensive normalization handles any malformed input from the preferences storage layer.

### `_build_headers() -> dict`
- **What it does:** Always adds `"accept": "application/json"`. If `settings.COINGECKO_API_KEY` is set, adds `"x-cg-demo-api-key"` header. CoinGecko's free public API works without a key but has lower rate limits.

### `get_coin_prices(assets: Any) -> tuple[list[dict], str]`
- **What it does:** Normalizes assets, maps to CoinGecko IDs, calls `GET /api/v3/simple/price` with `vs_currencies=usd&include_24hr_change=true`. For each asset, if the coin ID is missing from the response, falls back per-asset to `fallback_data.get_coin_prices([asset])`. On any exception, returns full fallback.
- **Timeout:** 8.0 seconds.
- **Returns:** `(list[dict], "live")` if any live data was returned; `(fallback, "fallback")` on total failure.

**Interview Q&A:**

**Q: Why does `get_coin_prices` return `"live"` even if some individual coins fell back?**
A: The source label `"live"` means the overall CoinGecko request succeeded. Individual missing coins are an API quirk (sometimes a symbol is temporarily unavailable), not a failure of the integration. Returning `"live"` is more accurate than `"fallback"` when most data is real. A more granular per-coin source label would require schema changes.

---

## backend/app/services/news_service.py

**Layer:** Service

**Purpose:** Fetches crypto news from NewsData.io with fallback to static demo articles.

**Key exports / public API:**
- `get_news() -> tuple[list[dict], str]`

**Function-by-function breakdown:**

### `get_news() -> tuple[list[dict], str]`
- **What it does:** Returns fallback immediately if `NEWSDATA_API_KEY` is empty. Otherwise calls `GET https://newsdata.io/api/1/latest` with `apikey`, `q=cryptocurrency OR bitcoin OR ethereum`, `language=en`, `size=5`. Takes the first 5 results from `data["results"]`. Each article gets `id: f"nd-{post['article_id']}"`, `summary` from `post["description"]` (falls back to `title` if `None`), `source` from `post["source_name"]`, `url` from `post["link"]`, `published_at` from `post["pubDate"]`.
- **Fallback:** Returns `(fallback_data.get_news(), "fallback")` if key absent, request fails, or `articles` list is empty.

**Interview Q&A:**

**Q: Why does `summary` fall back to `title` when `description` is None?**
A: NewsData.io's free tier occasionally omits the `description` field for some articles. Using `post.get("description") or post.get("title", "")` ensures the `summary` field is never an empty string, keeping the `NewsArticle` Pydantic model valid in all cases.

---

## backend/app/services/ai_service.py

**Layer:** Service

**Purpose:** Generates personalized AI crypto insights using a three-tier provider chain: OpenRouter → Hugging Face → static fallback.

**Key exports / public API:**
- `get_ai_insight(assets, investor_type) -> tuple[str, str]`
- `try_openrouter(assets, investor_type) -> str | None`
- `try_huggingface(assets, investor_type) -> str | None`

**Function-by-function breakdown:**

### `_build_prompt(assets, investor_type) -> str`
- **What it does:** Constructs a prompt that specifies: role (concise crypto analyst), task (2-sentence observation), audience (investor type + assets), constraints (no action recommendations, no bullet points), and required ending (the disclaimer string exactly).
- **Key decision:** Explicit constraints against "buying opportunity", "sell now", "buy now" are included to reduce financial advice risk from models that might generate them unprompted.

### `_normalise(raw: str) -> str`
- **What it does:** Strips any lines that exactly equal `"This is not financial advice."`, joins the remaining lines with a space, strips leading/trailing whitespace, then appends exactly one disclaimer.
- **Called by:** `_try_openrouter_model`, `try_huggingface`.
- **Key decision:** Handles the case where the model echoes the disclaimer from the prompt. Without normalization, the response could contain the disclaimer twice.

### `_try_openrouter_model(client, model, prompt) -> str | None`
- **What it does:** POSTs to `_OPENROUTER_URL` with the model, prompt, `max_tokens=120`, `temperature=0.7`. On non-200 response, logs the HTTP status and error message. On success, extracts `choices[0]["message"]["content"]`, strips whitespace, and normalises.
- **Key decision:** Logs status and error without logging the API key value (only `bool(key)` is logged in the outer function).

### `try_openrouter(assets, investor_type) -> str | None`
- **What it does:** Iterates `_OPENROUTER_MODELS` (4 models) in order inside a single `httpx.Client` context. Returns the first successful result. Logs a warning if all models fail.
- **Timeout:** 20.0 seconds per request (AI inference can be slow).

### `try_huggingface(assets, investor_type) -> str | None`
- **What it does:** Calls `https://router.huggingface.co/v1/chat/completions` with `HUGGINGFACE_API_KEY` and `HUGGINGFACE_MODEL`. Same response parsing and normalization as OpenRouter.

### `get_ai_insight(assets, investor_type) -> tuple[str, str]`
- **What it does:** Calls `try_openrouter` → `try_huggingface` → `fallback_data.get_ai_insight()`. Returns `(text, "live")` if any provider succeeds, `(text, "fallback")` if all fail.

**Interview Q&A:**

**Q: Why are four OpenRouter models tried in sequence rather than in parallel?**
A: Sequential is simpler and avoids paying for multiple API calls when the first succeeds. The models are free-tier, so the cost concern is rate limits, not money. If the first model is available (which it usually is), the total latency is just one request. Parallel requests would waste rate-limit quota on slower models that are not needed.

**Q: What prevents the AI from giving financial advice despite the prompt instructions?**
A: The prompt explicitly forbids action-oriented phrases and requires the disclaimer. The `_normalise` function ensures the disclaimer is always present in the output. However, these are best-effort soft controls — a language model can still produce advice-like content. The disclaimer and the frontend warning ("Not financial advice") are the primary user-facing safeguards.

---

## backend/app/services/feedback_service.py

**Layer:** Service

**Purpose:** Business logic for feedback operations — ownership validation before reading or writing votes.

**Key exports / public API:**
- `get_votes(db, user, daily_content_id) -> VotesResponse`
- `submit_feedback(db, user, req) -> FeedbackResponse`

**Function-by-function breakdown:**

### `get_votes(db, user, daily_content_id) -> VotesResponse`
- **What it does:** Fetches the `DailyContent` record by ID. Raises HTTP 404 if not found or if `daily.user_id != user.id` (ownership check). Calls `feedback_repository.get_votes_by_daily_content` and returns `VotesResponse`.
- **Called by:** `routes/feedback.py get_votes`.
- **Key decision:** Ownership check prevents a user from reading another user's vote history by guessing a `daily_content_id`.

### `submit_feedback(db, user, req) -> FeedbackResponse`
- **What it does:** Same ownership check on `req.daily_content_id`. Calls `feedback_repository.upsert` with all five identifying fields. Returns `FeedbackResponse.model_validate(record)`.
- **Called by:** `routes/feedback.py post_feedback`.
- **Key decision:** Returning the saved record (with the actual `id` and `vote`) allows the frontend to confirm what was stored, not just that the request succeeded.

**Interview Q&A:**

**Q: Why does submit_feedback validate that the daily_content record belongs to the current user?**
A: Without this check, a user could submit feedback against any `daily_content_id` in the database — including other users' snapshots. The `daily_content_id` comes from the client (the frontend stores it from the dashboard response), so it must be verified server-side. This is a standard authorization check: authenticate who you are, then verify you own the resource.

---

## backend/app/routes/auth.py

**Layer:** Route

**Purpose:** HTTP handlers for the three authentication endpoints.

**Key exports / public API:**
- `router` — `APIRouter(prefix="/api/auth", tags=["auth"])`

**Function-by-function breakdown:**

### `register(req, db) -> TokenResponse` — POST /api/auth/register
- **Status code:** 201 Created (set via `status_code=201`).
- **Delegates to:** `auth_service.register(db, req)`.

### `login(req, db) -> TokenResponse` — POST /api/auth/login
- **Status code:** 200 OK (default).
- **Delegates to:** `auth_service.login(db, req)`.

### `me(current_user) -> UserResponse` — GET /api/auth/me
- **Auth:** Protected via `Depends(get_current_user)`. No `db` dependency needed because `get_current_user` already resolves the user object.
- **Returns:** The resolved `current_user` ORM object; FastAPI serializes it using `UserResponse` (which has `from_attributes=True`).

**Interview Q&A:**

**Q: Why does the `me` endpoint not need a `db` dependency?**
A: `get_current_user` (which is a dependency of `me`) already fetches the `User` object from the DB. The resolved `User` object is injected directly into `me` as `current_user`. There is nothing more to query, so no `db` session is needed in the handler itself.

---

## backend/app/routes/onboarding.py

**Layer:** Route

**Purpose:** HTTP handlers for reading and saving user preferences.

**Key exports / public API:**
- `router` — `APIRouter(prefix="/api/onboarding", tags=["onboarding"])`

**Function-by-function breakdown:**

### `get_preferences(current_user, db) -> PreferenceResponse` — GET /api/onboarding/preferences
- **Behavior:** Returns 404 if preferences not yet set (new user who has not completed onboarding). Used by the frontend to detect onboarding status.

### `save_preferences(req, current_user, db) -> PreferenceResponse` — POST /api/onboarding/preferences
- **Status code:** 200 OK (upsert — could be create or update). Deliberately not 201 because 201 implies resource creation only, while this endpoint also updates.

**Interview Q&A:**

**Q: Why is the save_preferences endpoint POST rather than PUT or PATCH?**
A: The endpoint is an upsert — it creates the preference record if none exists and updates it if one does. `PUT` typically requires the client to know the resource URL (e.g., `/preferences/42`). Using `POST /api/onboarding/preferences` with upsert semantics is pragmatic for a "one preference record per user" design where the client does not track a preference ID.

---

## backend/app/routes/dashboard.py

**Layer:** Route

**Purpose:** Single endpoint for the full dashboard response.

**Key exports / public API:**
- `router` — `APIRouter(prefix="/api/dashboard", tags=["dashboard"])`

**Function-by-function breakdown:**

### `get_dashboard(current_user, db) -> DashboardResponse` — GET /api/dashboard
- **Behavior:** Fully delegates to `dashboard_service.get_dashboard`. May return 428 if preferences are missing.
- **Key decision:** Route handler has no logic — it is a thin HTTP adapter. All decisions live in the service.

---

## backend/app/routes/feedback.py

**Layer:** Route

**Purpose:** HTTP handlers for reading and submitting feedback votes.

**Key exports / public API:**
- `router` — `APIRouter(prefix="/api/feedback", tags=["feedback"])`

**Function-by-function breakdown:**

### `get_votes(daily_content_id, db, current_user) -> VotesResponse` — GET /api/feedback
- **Query parameter:** `daily_content_id: int` — passed as a URL query parameter (`/api/feedback?daily_content_id=7`).

### `post_feedback(req, db, current_user) -> FeedbackResponse` — POST /api/feedback
- **Status code:** 200 OK (default). 201 would imply creation only; since the endpoint updates existing votes, 200 is accurate.

---

## backend/app/utils/fallback_data.py

**Layer:** Utility

**Purpose:** Static fallback data for all four dashboard sections, returned when external APIs are unavailable.

**Key exports / public API:**
- `get_coin_prices(assets: list[str]) -> list[dict]`
- `get_news() -> list[dict]`
- `get_ai_insight() -> str`
- `get_meme() -> dict`

**Function-by-function breakdown:**

### `_COIN_PRICES` dict
- **What it is:** A dict keyed by symbol. Fallback data uses full coin names (`"name": "Bitcoin"`) whereas CoinGecko live data uses `"name" == "symbol"` (both `"BTC"`). This difference is the heuristic used by `_infer_data_sources` in `dashboard_service`.

### `_NEWS` list
- **What it is:** 5 static news articles. All have `"source": "Demo Content"` and `"url": "#"`. The `"Demo Content"` source name is the heuristic used by `_infer_data_sources` to identify fallback news.

### `get_coin_prices(assets) -> list[dict]`
- **What it does:** Filters `_COIN_PRICES` to only the requested symbols. Symbols not in `_COIN_PRICES` are silently omitted.

### `get_ai_insight() -> str`
- **What it does:** Returns a random choice from `_AI_INSIGHTS` (6 entries). Note: fallback insights do NOT end with `"This is not financial advice."`, which is the heuristic used to distinguish them from live AI responses.

### `get_meme() -> dict`
- **What it does:** Returns a random choice from `_MEMES` (6 entries). Each meme has `id`, `caption`, and `image_url` (pointing to imgflip.com CDN).

**Interview Q&A:**

**Q: Why do fallback AI insights not include the "This is not financial advice." disclaimer?**
A: The disclaimer is appended by `_normalise()` in `ai_service.py` for live AI responses. The static fallback strings predate this pattern and were never updated with the disclaimer. This asymmetry is intentional — it is the heuristic `_infer_data_sources` uses to detect cached live vs. cached fallback AI insights.

**Q: What happens if a user's preferred asset (e.g., DOT) is not in the CoinGecko response and also not in `_COIN_PRICES`?**
A: `get_coin_prices([asset])` returns an empty list for that asset (the list comprehension skips symbols not in `_COIN_PRICES`). The coin simply does not appear in the dashboard. All 10 supported symbols are present in both `_COIN_PRICES` and `_SYMBOL_TO_ID`, so this edge case should not occur with valid preferences.

---

## frontend/src/main.jsx

**Layer:** Infrastructure (frontend entry point)

**Purpose:** Mounts the React application into the DOM using React 18's `createRoot` API and imports global CSS.

**Key exports / public API:**
- None (side-effect only — renders the app)

**Function-by-function breakdown:**

### `createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>)`
- **What it does:** Finds the `<div id="root">` element in `index.html`, creates a React 18 concurrent root, and renders the `App` component wrapped in `StrictMode`.
- **`StrictMode`:** In development, renders components twice to detect side effects. Has no effect in production builds.
- **`import './styles/global.css'`:** Loaded here so styles apply globally before any component renders.

---

## frontend/src/App.jsx

**Layer:** Infrastructure (router)

**Purpose:** Defines the client-side route tree, wraps the app in `AuthProvider`, and applies route guards via `ProtectedRoute` and `PublicRoute`.

**Key exports / public API:**
- `App` — default export, the root component

**Function-by-function breakdown:**

### `App()`
- **What it does:** Renders `<AuthProvider>` wrapping a `<BrowserRouter>` with five declared routes and a catch-all redirect.
- **Route structure:**
  - `/login` → `<PublicRoute><LoginPage /></PublicRoute>`
  - `/signup` → `<PublicRoute><SignupPage /></PublicRoute>`
  - `/onboarding` → `<ProtectedRoute><OnboardingPage /></ProtectedRoute>`
  - `/dashboard` → `<ProtectedRoute><DashboardPage /></ProtectedRoute>`
  - `/preferences` → `<ProtectedRoute><PreferencesPage /></ProtectedRoute>`
  - `*` → `<Navigate to="/login" replace />`
- **Key decision:** `AuthProvider` wraps `BrowserRouter` so that route guards (`ProtectedRoute`, `PublicRoute`) can access `useAuth` via context. If the order were reversed, context would not be available inside the router.

**Interview Q&A:**

**Q: Why is `AuthProvider` placed outside `BrowserRouter`?**
A: React context must wrap everything that consumes it. Route guard components (`ProtectedRoute`, `PublicRoute`) call `useAuth()`, which reads from `AuthContext`. If `AuthProvider` were inside `BrowserRouter`, the guards would still work — but placing it outside is idiomatic and ensures auth state is available even before routing resolves.

---

## frontend/src/context/AuthContext.jsx

**Layer:** Context

**Purpose:** Provides application-wide authentication state (`user`, `loading`) and actions (`storeLogin`, `logout`) via React Context.

**Key exports / public API:**
- `AuthProvider` — context provider component
- `useAuth()` — hook returning `{ user, loading, storeLogin, logout }`

**Function-by-function breakdown:**

### `AuthProvider({ children })`
- **What it does:** On mount, reads `localStorage.getItem("token")`. If a token exists, calls `getMe()` (GET /api/auth/me) to validate it and populate `user`. On error, removes the invalid token from localStorage. Sets `loading=false` in all cases via `.finally()`.
- **State:** `user` (null or `{ id, name, email }`) and `loading` (boolean, starts `true`).
- **Key decision:** The `loading=true` initial state prevents route guards from redirecting before the token validation completes. Without it, an authenticated user would briefly see the login page on refresh.

### `storeLogin(token, userData)`
- **What it does:** Stores the JWT in `localStorage` under `"token"` and sets `user` state to `userData`.
- **Called by:** `LoginPage` and `SignupPage` after successful authentication.

### `logout()`
- **What it does:** Removes `"token"` from `localStorage` and sets `user` to `null`. Components observing `useAuth()` re-render automatically.
- **Called by:** `Navbar`, `LoginPage` (on error), `OnboardingPage`.

### `useAuth()`
- **What it does:** Calls `useContext(AuthContext)` and returns the context value.
- **Key decision:** Exporting a named hook (`useAuth`) rather than the raw context object is idiomatic — it hides the context import and can be enhanced with error handling later.

**Interview Q&A:**

**Q: What happens if the JWT in localStorage is expired when the user returns to the app?**
A: `getMe()` sends the expired token to `GET /api/auth/me`. The backend's `decode_access_token` detects the expiry (via `JWTError`) and returns `None`, causing `get_current_user` to raise HTTP 401. `getMe()` throws, the `.catch()` in `AuthProvider`'s `useEffect` removes the token from localStorage, and `loading` is set to `false` with `user` remaining `null`. Route guards then redirect to `/login`.

**Q: Why is user data fetched again with `getMe()` after login/signup instead of decoding the JWT on the client?**
A: JWTs can be decoded client-side without a key (base64), but the payload only contains `sub` (user ID) and `exp`. The application needs `name` and `email` for the UI. Calling `GET /api/auth/me` is cleaner than client-side JWT decoding and also validates that the token is accepted by the server.

---

## frontend/src/components/ProtectedRoute.jsx

**Layer:** Component

**Purpose:** Route guard that redirects unauthenticated users to `/login`, showing a spinner during auth state resolution.

**Key exports / public API:**
- `ProtectedRoute` — default export

**Function-by-function breakdown:**

### `ProtectedRoute({ children })`
- **What it does:** Reads `user` and `loading` from `useAuth()`. If `loading` is true, renders a spinner (`<div className="page-loading"><span className="spinner" /></div>`). If `!user`, renders `<Navigate to="/login" replace />`. Otherwise renders `children`.
- **Key decision:** The `replace` prop on `Navigate` replaces the current history entry instead of pushing a new one. This prevents the user from pressing the back button to return to the protected page while unauthenticated.

---

## frontend/src/components/PublicRoute.jsx

**Layer:** Component

**Purpose:** Route guard that redirects authenticated users to `/dashboard`, preventing them from seeing login/signup pages unnecessarily.

**Key exports / public API:**
- `PublicRoute` — default export

**Function-by-function breakdown:**

### `PublicRoute({ children })`
- **What it does:** Mirror of `ProtectedRoute`. If `loading`, shows spinner. If `user` exists, redirects to `/dashboard`. Otherwise renders children (the public page).
- **Key decision:** Same spinner during loading prevents a flash of the login form for authenticated users who are still validating their token on mount.

---

## frontend/src/components/Navbar.jsx

**Layer:** Component

**Purpose:** Persistent navigation header rendered on authenticated pages (`DashboardPage`, `PreferencesPage`). Shows logo, navigation links with active state, user name badge, and logout button.

**Key exports / public API:**
- `Navbar` — default export

**Function-by-function breakdown:**

### `Navbar()`
- **What it does:** Reads `pathname` from `useLocation()` to apply the `nav-btn--active` class to the current page's nav button. Reads `user` from `useAuth()` to display `user.name`. Logout calls `logout()` and navigates to `/login`.
- **Navigation buttons:** Dashboard (`/dashboard`) and Preferences (`/preferences`).
- **Key decision:** `useLocation().pathname` is used instead of a prop to determine the active tab — the component knows its own location without the parent needing to pass it.

---

## frontend/src/components/VoteButtons.jsx

**Layer:** Component

**Purpose:** Thumbs-up/thumbs-down vote UI for each dashboard section, with local state for voted state, in-flight state, and saved confirmation.

**Key exports / public API:**
- `VoteButtons` — default export

**Props:**
- `dailyContentId` — integer ID of the daily_content row
- `sectionType` — backend section type string (`"market_news"`, `"coin_prices"`, `"ai_insight"`, `"meme"`)
- `contentItemId` — identifier of the voted item
- `initialVote` — `"up"`, `"down"`, or `null` (restored from server on load)

**Function-by-function breakdown:**

### `handleVote(vote)`
- **What it does:** Guards against double-submission with `submitting` state. Calls `submitVote(dailyContentId, sectionType, contentItemId, vote)`. On success: sets `voted = vote`, sets `justSaved = true`. On error: sets `error` message.
- **Key decision:** `justSaved` and `voted` are separate state variables. `voted` reflects the server-confirmed vote value (and is initialized from `initialVote`). `justSaved` is `false` on initial load even if `initialVote` is set — "Saved" only appears after a user action in the current session.

### Render
- **`voted === 'up'`:** Adds `.voted-up` class (green styling) to the thumbs-up button.
- **`voted === 'down'`:** Adds `.voted-down` class (red styling) to the thumbs-down button.
- **`justSaved && !error`:** Shows an animated `<Check size={11} /> Saved` span.
- **`whileTap={{ scale: 0.9 }}`:** Framer Motion tap animation on both buttons.

**Interview Q&A:**

**Q: Why are `voted` and `justSaved` separate state variables instead of a single state?**
A: `voted` persists the vote value (initialized from `initialVote` on load, updated on each new vote). `justSaved` is ephemeral — it should be `false` when the vote is restored from the server and `true` only after an interactive click. Combining them into a single state would require additional logic to distinguish "loaded from server" from "just submitted by user".

---

## frontend/src/services/api.js

**Layer:** Service (frontend)

**Purpose:** Base HTTP fetch wrapper that reads the API base URL from the Vite env variable, attaches JWT auth headers, and normalizes FastAPI error responses.

**Key exports / public API:**
- `api.get(path) -> Promise<data>`
- `api.post(path, body) -> Promise<data>`

**Function-by-function breakdown:**

### `getHeaders() -> object`
- **What it does:** Always includes `"Content-Type": "application/json"`. If `localStorage.getItem("token")` is truthy, adds `"Authorization": "Bearer <token>"`.
- **Key decision:** Reads the token from localStorage on every call (not cached) so that after logout, subsequent requests immediately use no token.

### `request(method, path, body) -> Promise<data>`
- **What it does:** Calls `fetch(BASE_URL + path, ...)`. Parses the response as JSON (with `.catch(() => ({}))` to handle non-JSON error bodies). If `!res.ok`, extracts the error detail: if `data.detail` is an array (FastAPI validation errors are arrays of objects with `msg`), joins all `msg` values with `"; "`. Otherwise uses `data.detail` directly or falls back to `"HTTP <status>"`. Throws a `new Error(detail)`.
- **`BASE_URL`:** `import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'`. The Vite env variable is injected at build time.

**Interview Q&A:**

**Q: Why does the error handler check `Array.isArray(data.detail)`?**
A: FastAPI validation errors (HTTP 422) return `detail` as an array of objects: `[{ loc: [...], msg: "...", type: "..." }]`. A single error (like HTTP 401) returns `detail` as a string. The check handles both formats so the frontend always shows a human-readable error message regardless of FastAPI's response shape.

**Q: What is `import.meta.env.VITE_API_BASE_URL`?**
A: Vite's mechanism for injecting environment variables at build time. Variables prefixed with `VITE_` in the `.env` file are replaced by their string values in the compiled bundle. In the Docker frontend container, `VITE_API_BASE_URL=http://localhost:8000` is set. In Vercel production, it would be set to the Render backend URL.

---

## frontend/src/services/authApi.js

**Layer:** Service (frontend)

**Purpose:** API functions for the three authentication endpoints.

**Key exports / public API:**
- `register(name, email, password) -> Promise<{ access_token, token_type }>`
- `login(email, password) -> Promise<{ access_token, token_type }>`
- `getMe() -> Promise<{ id, name, email }>`

All three are thin wrappers around `api.get` or `api.post`.

---

## frontend/src/services/dashboardApi.js

**Layer:** Service (frontend)

**Purpose:** Single function to fetch dashboard data.

**Key exports / public API:**
- `getDashboard() -> Promise<DashboardResponse>`

One line: `api.get("/api/dashboard")`.

---

## frontend/src/services/feedbackApi.js

**Layer:** Service (frontend)

**Purpose:** API functions for reading and submitting feedback votes.

**Key exports / public API:**
- `submitVote(daily_content_id, section_type, content_item_id, vote) -> Promise<FeedbackResponse>`
- `getVotes(daily_content_id) -> Promise<VotesResponse>`

**`getVotes`** uses `api.get(\`/api/feedback?daily_content_id=${daily_content_id}\`)` — the query parameter is appended directly to the URL string.

---

## frontend/src/services/onboardingApi.js

**Layer:** Service (frontend)

**Purpose:** API functions for reading and saving user preferences.

**Key exports / public API:**
- `getPreferences() -> Promise<PreferenceResponse>`
- `savePreferences(interested_assets, investor_type, content_types) -> Promise<PreferenceResponse>`

Used both by `OnboardingPage` (initial setup) and `PreferencesPage` (updating).

---

## frontend/src/pages/LoginPage.jsx

**Layer:** Page

**Purpose:** Login form page with email/password inputs, error display, and post-login routing based on onboarding status.

**Key exports / public API:**
- `LoginPage` — default export

**Function-by-function breakdown:**

### `handleSubmit(e)`
- **What it does:** (1) Calls `login(email, password)` to get `access_token`. (2) Stores token in localStorage immediately (so `getMe()` can use it). (3) Calls `getMe()` to fetch user data. (4) Calls `storeLogin(access_token, userData)` to update `AuthContext`. (5) Calls `getPreferences()` — if it resolves (200), navigates to `/dashboard`; if it throws (404 or any error), navigates to `/onboarding`. On any earlier error: removes token from localStorage, sets `error` state.
- **Key decision:** `getPreferences()` is used as an onboarding status check because it returns 404 for users who have not completed onboarding. This avoids a dedicated "has user onboarded?" endpoint.

**Interview Q&A:**

**Q: Why is the token stored in localStorage before calling `getMe()`, and then removed on error?**
A: `api.js` reads the token from localStorage on every request. Storing it before `getMe()` ensures the `Authorization: Bearer` header is attached to that request. If `getMe()` fails (invalid token), removing the token from localStorage leaves the application in a clean unauthenticated state.

---

## frontend/src/pages/SignupPage.jsx

**Layer:** Page

**Purpose:** Registration form with name, email, and password fields. Always redirects to `/onboarding` on success (new users have no preferences yet).

**Key exports / public API:**
- `SignupPage` — default export

**Function-by-function breakdown:**

### `handleSubmit(e)`
- **What it does:** Calls `register(name, email, password)`, stores token, calls `getMe()`, calls `storeLogin`, then unconditionally navigates to `/onboarding`. Unlike `LoginPage`, there is no `getPreferences()` check — a freshly registered user will never have preferences.
- **Key decision:** New users always go to `/onboarding`. This is why `PublicRoute` redirects authenticated users to `/dashboard` instead of `/onboarding` — it avoids sending a returning user to the onboarding flow.

---

## frontend/src/pages/OnboardingPage.jsx

**Layer:** Page

**Purpose:** Three-section onboarding form: asset selection (chip grid), investor type (chip grid), and content priority (icon card grid). Redirects to `/dashboard` if the user has already completed onboarding.

**Key exports / public API:**
- `OnboardingPage` — default export

**Function-by-function breakdown:**

### `useEffect` (mount)
- **What it does:** Calls `getPreferences()` on mount. If it succeeds (user already has preferences), redirects to `/dashboard` with `{ replace: true }`. If it fails (404), sets `checking=false` to show the form.
- **Key decision:** `replace: true` prevents the onboarding page from appearing in browser history for already-onboarded users, so the back button does not navigate to it.

### `handleSubmit(e)`
- **What it does:** Client-side validation: at least one asset required, investor type required, at least one content type required. Calls `savePreferences(assets, investorType, contentTypes)` and navigates to `/dashboard` on success.

### `toggle(list, value) -> list`
- **What it does:** If `value` is in `list`, removes it. If not, appends it. Used for multi-select chip behavior.
- **Key decision:** A pure function — does not mutate the list. Safe to use with React's functional state updater pattern.

**Interview Q&A:**

**Q: Why does the page show a loading spinner initially instead of the form?**
A: The `getPreferences()` check on mount is asynchronous. During the network request, `checking=true` shows the spinner. Without this, the form would flash briefly before the redirect happens for already-onboarded users.

---

## frontend/src/pages/DashboardPage.jsx

**Layer:** Page

**Purpose:** The main dashboard page displaying four content sections in user-preference order, with source labels, vote buttons, and vote state restored from the server.

**Key exports / public API:**
- `DashboardPage` — default export

**Key constants:**
- `ALL_SECTIONS = ['news', 'prices', 'ai_insight', 'meme']` — default order.
- `SECTION_TYPE` — maps frontend section keys to backend `section_type` strings.
- `SECTION_LABELS`, `SECTION_ICONS` — display metadata.

**Function-by-function breakdown:**

### `orderedSections(contentTypes) -> string[]`
- **What it does:** Takes the user's `content_types` list (e.g., `["prices", "meme"]`). Filters to only valid section keys. Appends any `ALL_SECTIONS` entries not already in the list. Returns the merged ordered array.
- **Example:** `contentTypes=["prices","meme"]` → `["prices","meme","news","ai_insight"]`.

### `getContentItemId(sectionKey, dashboard) -> string`
- **What it does:** For the meme section, uses `dashboard?.meme?.id` (e.g., `"meme-003"`). For all other sections, uses `SECTION_TYPE[sectionKey]` (e.g., `"coin_prices"`). This matches what the backend stores as `content_item_id`.

### `formatSourceLabel(src) -> string`
- **What it does:** Maps `"live"` → `"live"`, `"static_json"` → `"static"`, anything else → `"demo"`.

### `useEffect` / `load()`
- **What it does:** Calls `Promise.all([getDashboard(), getPreferences().catch(...)])` in parallel. After both resolve, calls `getVotes(dashData.daily_content_id)` sequentially (needs `daily_content_id` from the dashboard response). Sets state: `dashboard`, `prefs`, `sections` (ordered), `votes`.
- **Key decision:** `getPreferences()` has a `.catch(() => ({ content_types: [], interested_assets: [] }))` — preference fetch failure is non-fatal. Section order falls back to `ALL_SECTIONS` default.

### `SectionCard({ sectionKey, dashboard, votes, index, prefs })`
- **What it does:** Computes `sourceLabel`, `sectionType`, `contentItemId`. Looks up `voteEntry = votes?.[sectionType]` and derives `initialVote = voteEntry?.content_item_id === contentItemId ? voteEntry.vote : null`. Renders the appropriate content sub-component and a `VoteButtons` instance.
- **`initialVote` derivation:** Checks that `voteEntry.content_item_id` matches the current `contentItemId`. This matters for the meme section where `contentItemId` is specific (e.g., `"meme-003"`) — if the user refreshed and got a different meme, the vote for the old meme should not be shown as active.

**Interview Q&A:**

**Q: Why is `getVotes` called after `Promise.all` resolves instead of being included in the `Promise.all`?**
A: `getVotes` requires `dashData.daily_content_id`, which is only available after `getDashboard()` resolves. Including it in `Promise.all` would require knowing the ID in advance. Calling it sequentially after the parallel requests is the correct approach.

**Q: What is the purpose of the `sections` state vs. just using `orderedSections` inline in the render?**
A: Computing `orderedSections` once and storing the result prevents the ordering from recalculating on every render (if `prefs` or `sections` triggers a re-render for other reasons). More importantly, storing it separately makes the data flow explicit: the `load` function computes the order and stores it; the render just maps over `sections`.

---

## frontend/src/pages/PreferencesPage.jsx

**Layer:** Page

**Purpose:** Editable preferences form for authenticated users, pre-populated from the API. Navigates to `/dashboard` on save.

**Key exports / public API:**
- `PreferencesPage` — default export

**Function-by-function breakdown:**

### `normalizeList(value) -> string[]`
- **What it does:** Accepts an array (returned as-is), a comma-separated string (split and trimmed), or null/undefined (returns `[]`). Defensive normalization in case the API returns a string instead of a parsed array.
- **Key decision:** Added because early API responses could return comma-separated strings; also guards against any future serialization inconsistency.

### `useEffect` (mount)
- **What it does:** Calls `getPreferences()` and pre-populates all three state variables (`assets`, `investorType`, `contentTypes`) using `normalizeList`. Silently ignores errors (form starts empty if preferences are not loadable).

### `handleSubmit(e)`
- **What it does:** Same validation as `OnboardingPage`. Calls `savePreferences(assets, investorType, contentTypes)` and navigates to `/dashboard` on success.
- **Key difference from `OnboardingPage`:** Uses `setAssets((prev) => toggle(prev, a))` — functional updater form — to avoid stale closure bugs. `OnboardingPage` uses `setAssets(toggle(assets, a))` (captured closure), which can silently drop rapid clicks.

**Interview Q&A:**

**Q: Why does PreferencesPage use the functional state updater form `setAssets((prev) => ...)` while OnboardingPage does not?**
A: `PreferencesPage` was written later, after a bug was identified where rapid clicks on asset chips would be lost because both clicks operated on the same captured closure value. The functional updater `(prev) => toggle(prev, a)` guarantees React applies each update to the latest committed state. `OnboardingPage` retains the older pattern — this is a known inconsistency and an acknowledged MVP limitation.

---

## docker-compose.yml

**Layer:** Infrastructure

**Purpose:** Defines the three-service Docker Compose stack: `postgres`, `backend`, `frontend`.

**Key decisions:**

### postgres service
- `image: postgres:15` with `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB` (defaults: `postgres`, `postgres`, `crypto_advisor`).
- Port mapping `5433:5432` — host port 5433 avoids conflicts with any locally installed PostgreSQL.
- `healthcheck: pg_isready -U ${POSTGRES_USER:-postgres}` — checks every 5 seconds, 5 retries. The `backend` service uses `condition: service_healthy` to wait.

### backend service
- `depends_on: postgres: condition: service_healthy` — backend only starts after `pg_isready` succeeds.
- `env_file: ./backend/.env` — loads optional API keys into the container.
- `environment` block — overrides `.env` values with Docker-specific ones: `DATABASE_URL` uses `postgres` (service name) as hostname, not `localhost`.
- `command: sh -c "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"` — runs migrations before starting the server on every container start (idempotent).

### frontend service
- `depends_on: - backend` — starts after backend service is created, not necessarily healthy.
- `volumes: - ./frontend:/app` — bind mount for hot reload during development.
- `- /app/node_modules` — anonymous volume keeps the container's `node_modules` from being overwritten by the bind mount.
- `VITE_API_BASE_URL: http://localhost:8000` — React code runs in the browser, not inside Docker, so it uses `localhost` (the host machine's address), not the service name `backend`.

**Interview Q&A:**

**Q: Why does the frontend use `http://localhost:8000` for `VITE_API_BASE_URL` instead of `http://backend:8000`?**
A: Vite environment variables are injected at build time and embedded in the JavaScript bundle served to the browser. The browser runs on the user's machine (outside Docker), where `backend` is not a resolvable hostname. `localhost:8000` is the port-forwarded address that maps to the backend container. Using `backend:8000` would only work for server-to-server communication within the Docker network.

**Q: Why is `alembic upgrade head` run on every container start instead of only during the initial deployment?**
A: `alembic upgrade head` is idempotent — if all migrations have already been applied, it detects the current revision and exits immediately. Running it on every start means any new migrations are applied automatically when the container is restarted after a code update, without a separate migration step. The risk of accidentally running destructive migrations is managed by reviewing migration files before deploying.

---

## backend/Dockerfile

**Layer:** Infrastructure

**Purpose:** Builds the Python backend Docker image from `python:3.11-slim`.

**Build steps:**
1. `WORKDIR /app`
2. `COPY requirements.txt .` + `RUN pip install --no-cache-dir -r requirements.txt` — dependencies are installed before copying source code, allowing Docker's layer cache to skip this expensive step when only source files change.
3. `COPY . .` — copies all application code.
4. `EXPOSE 8000`
5. `CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]` — overridden by docker-compose to prepend `alembic upgrade head`.

**Key decision:** `--no-cache-dir` in `pip install` reduces the image size by not caching downloaded packages.

---

## frontend/Dockerfile

**Layer:** Infrastructure

**Purpose:** Builds the Node.js frontend Docker image from `node:20-alpine` for the Vite dev server.

**Build steps:**
1. `WORKDIR /app`
2. `COPY package.json package-lock.json* ./` + `RUN npm install` — same layer-caching pattern as the backend.
3. `COPY . .`
4. `EXPOSE 5173`
5. `CMD ["npm", "run", "dev"]` — starts the Vite development server.

**Key decision:** `node:20-alpine` is a minimal Alpine-based image. The `package-lock.json*` glob (with wildcard) copies the lockfile only if it exists, preventing a build failure if it is absent.

---

## backend/alembic/env.py

**Layer:** Infrastructure

**Purpose:** Configures Alembic to read `DATABASE_URL` from the application's `Settings` and to discover all SQLAlchemy models for autogenerate support.

**Key decisions:**

### `config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)`
- Overrides the `sqlalchemy.url` in `alembic.ini` (which has no hardcoded URL). The URL is always read from the `.env` file via `app.core.config.settings`. This means Alembic and the running application always use the same connection string.

### `import app.models  # noqa: F401`
- The `# noqa: F401` comment suppresses the "imported but unused" linter warning. The import is not unused — it registers all model classes with `Base.metadata` so that `alembic revision --autogenerate` can detect schema changes.

### `target_metadata = Base.metadata`
- Tells Alembic to compare the database schema against the models discovered via `Base.metadata` when generating migrations.

### `run_migrations_online` using `pool.NullPool`
- `NullPool` disables connection pooling for Alembic migration runs. Migrations should not share a pool with the application's request pool. `NullPool` creates a fresh connection for the migration and closes it immediately after.

**Interview Q&A:**

**Q: Why does `env.py` import `app.models` with a noqa comment?**
A: SQLAlchemy's `DeclarativeBase` only knows about models that have been imported (because the model class definition registers itself with `Base.metadata` at import time). Alembic's autogenerate needs `Base.metadata` to be fully populated with all four tables. The import appears "unused" to linters because the module is imported only for its side effect.

---

## backend/alembic/versions/7e926063c2cd_create_initial_tables.py

**Layer:** Infrastructure

**Purpose:** The single Alembic migration that creates all four tables (`users`, `daily_content`, `user_preferences`, `feedback`) with all constraints and indexes.

**Key elements in `upgrade()`:**

- **`users`:** `UniqueConstraint("email")` + explicit `Index("ix_users_email", "email")`.
- **`daily_content`:** Created before `user_preferences` and `feedback` because both reference it. `UniqueConstraint("user_id", "date", name="uq_daily_content_user_date")`. Both `user_id` and `id` are indexed.
- **`user_preferences`:** `ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE")`. `UniqueConstraint("user_id")` (no name — anonymous constraint).
- **`feedback`:** Two FK constraints (to `users.id` and `daily_content.id`, both `ondelete="CASCADE"`). `UniqueConstraint("user_id", "daily_content_id", "section_type", "content_item_id", name="uq_feedback_vote")`. Three indexes: `user_id`, `daily_content_id`, `id`.

**`down_revision = None`:** This is the root migration — no previous revision. `alembic downgrade -1` from this state would drop all tables.

**Interview Q&A:**

**Q: Why is `daily_content` created before `user_preferences` and `feedback` in the migration?**
A: The `feedback` table has a foreign key referencing `daily_content.id`. PostgreSQL requires the referenced table to exist before the referencing table is created. Alembic's autogenerate determines the correct creation order based on foreign key dependencies.

**Q: What does `ondelete="CASCADE"` in the migration mean, and how does it interact with SQLAlchemy?**
A: `ondelete="CASCADE"` on the `ForeignKeyConstraint` tells PostgreSQL to automatically delete child rows when the parent row is deleted. SQLAlchemy's ORM also fires cascade events, but the database-level cascade is the authoritative guarantee. Both are active in this codebase — the ORM `delete()` call in `daily_content_repository.delete_by_user_and_date` triggers SQLAlchemy events, and the DB-level cascade handles cases where rows are deleted directly via SQL.
