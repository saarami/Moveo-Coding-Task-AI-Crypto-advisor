# CLAUDE.md

## Project

AI Crypto Advisor is a full stack web application that provides a personalized crypto investor dashboard.

Stack:
- Frontend: React + Vite
- Backend: FastAPI + Python
- Database: PostgreSQL
- ORM: SQLAlchemy
- Migrations: Alembic
- Auth: JWT + bcrypt
- Deployment: Vercel + Render + Neon/Supabase PostgreSQL

## Required Reading

Before implementing anything, read these files:

- @docs/architecture.md
- @docs/implementation_plan.md

## Work Rules

- Work one phase at a time.
- Do not continue to the next phase without user confirmation.
- Keep changes scoped to the current phase.
- Explain what changed, which files changed, and how to test.
- Do not add unnecessary packages.
- Do not rewrite unrelated code.
- Do not commit secrets or `.env` files.
- All code comments must be written in English.

## Backend Rules

Use layered architecture:

```text
routes -> services -> repositories -> models
```

Responsibilities:
- `routes`: HTTP layer only
- `schemas`: Pydantic request/response validation
- `services`: business logic
- `repositories`: database queries
- `models`: SQLAlchemy tables
- `core`: config, database, security


## Database Rules

Use the database design from `docs/architecture.md` as the source of truth.

Important model rules:
- `users.email` must be unique and indexed.
- `user_preferences.user_id` must reference `users.id` and should be unique.
- `daily_content` stores one daily dashboard snapshot per user per date.
- `daily_content(user_id, date)` must be unique.
- `feedback` references only `users.id` — no FK to `daily_content`.
- `feedback` uses `section_type`, `content_item_id`, `vote`, and `content_snapshot`.
- `feedback(user_id, section_type, content_item_id)` must be unique to prevent duplicate votes.
- `content_snapshot` stores a JSON copy of the exact content voted on directly in the `feedback` row.

## Frontend Rules

Keep the frontend organized:

```text
pages -> components -> services -> context
```

Responsibilities:
- `pages`: full screens
- `components`: reusable UI
- `services`: API calls
- `context`: auth state and shared state

## Security Rules

- Store only hashed passwords.
- Use JWT for protected routes.
- Use environment variables for secrets.
- Add `.env.example`.
- Never commit `.env`.
- Validate user input.

## MCP Guidance

If MCP tools are available:

- Filesystem MCP: inspect and edit project files only as needed.
- Git MCP: review diffs and commit only after approval.
- PostgreSQL MCP: inspect schema/data, never delete data without approval.
- Browser/Playwright MCP: test signup, login, onboarding, dashboard, and voting flows.

## Development Command Examples

Backend:

```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:

```bash
cd frontend
npm run dev
```

## Phase Completion Format

After each phase, respond with:

1. What was implemented
2. Files created or modified
3. How to test
4. Known issues, if any
5. Next recommended phase
