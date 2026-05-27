# Implementation Plan

This document describes the phased implementation process used during the development of the AI Crypto Advisor project.

The project was built incrementally, one phase at a time. After each major phase, I manually tested the relevant flow before continuing. During development, some intermediate steps and fixes were added as needed based on testing results, debugging, and code review.

This file represents the working process used to build the project, not just an initial theoretical plan.

## Rule

Build one phase at a time.  
After each phase, update `docs/implementation_progress.md`.

---

## Phase 1 — Project Setup

Goal: create the base project structure.

Tasks:
- Create `backend/`
- Create `frontend/`
- Create `docs/`
- Create `.gitignore`
- Create `README.md`
- Create `.env.example` files later per app

Done when:
- The project structure exists.
- Git is initialized.
- Secret files are ignored.

---

## Phase 2 — FastAPI Backend Setup

Goal: create a working FastAPI server.

Tasks:
- Create `backend/app/main.py`
- Add CORS
- Add `GET /health`
- Create `requirements.txt`
- Create backend `.env.example`

Done when:
- Backend runs locally.
- `/health` returns `{ "status": "ok" }`.
- Swagger works at `/docs`.

---

## Phase 3 — PostgreSQL Setup

Goal: connect backend to PostgreSQL.

Tasks:
- Add PostgreSQL to `docker-compose.yml`
- Add `DATABASE_URL`
- Add SQLAlchemy
- Add Alembic
- Create `database.py`
- Configure migrations

Done when:
- PostgreSQL runs locally.
- Alembic can run migrations.

---

## Phase 4 — Database Models

Goal: create initial database schema.

Tasks:
- Create `User`
- Create `UserPreference`
- Create `DailyContent`
- Create `Feedback`
- Add unique constraint for `users.email`
- Add unique constraint for `user_preferences.user_id`
- Add unique constraint for `daily_content.user_id` + `daily_content.date`
- Add unique constraint for `feedback.user_id` + `feedback.section_type` + `feedback.content_item_id`
- Add foreign keys between users, preferences, and daily content (feedback has no FK to daily_content)
- Add `content_snapshot` JSON column to `feedback` for storing the exact content voted on
- Generate migration
- Apply migration

Done when:
- Tables exist in PostgreSQL.
- Constraints and foreign keys are created correctly.

---

## Phase 5 — Authentication Backend

Goal: implement signup, login, and protected user route.

Tasks:
- Add auth schemas
- Add password hashing
- Add JWT creation and validation
- Add user repository
- Add auth service
- Add auth routes

Endpoints:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

Done when:
- User can register.
- User can login.
- JWT works.
- Passwords are hashed.

---

## Phase 6 — Onboarding Backend

Goal: save and load user preferences.

Tasks:
- Add preference schema
- Add preference repository
- Add onboarding service
- Add onboarding routes

Endpoints:
- `GET /api/onboarding/preferences`
- `POST /api/onboarding/preferences`

Done when:
- Authenticated user can save preferences.
- Authenticated user can retrieve preferences.

---

## Phase 7 — Dashboard Backend with Fallback Data

Goal: return dashboard data without relying on external APIs yet.

Tasks:
- Add dashboard route
- Add dashboard service
- Add static coin prices
- Add static news
- Add static AI insight
- Add static meme list
- Check whether a `daily_content` record already exists for the current user and date
- Create a new `daily_content` snapshot when no daily record exists
- Return stable `section_content_ids` (hash-based per section) for feedback vote restoration

Endpoint:
- `GET /api/dashboard`

Done when:
- Authenticated user with preferences gets a full dashboard response.
- The daily dashboard snapshot is saved or reused from PostgreSQL.

---

## Phase 8 — External API Integration

Goal: connect real APIs while keeping fallback data.

Tasks:
- Connect CoinGecko for prices
- Connect NewsData.io for news
- Connect OpenRouter or Hugging Face for AI insight
- Keep static fallback for each external service
- Store the generated external/fallback response in `daily_content`

Done when:
- Dashboard works with APIs.
- Dashboard still works if APIs fail.
- The stored daily snapshot reflects the actual content shown to the user.

---

## Phase 9 — React Frontend Setup

Goal: create frontend app and routes.

Tasks:
- Create React + Vite app
- Add React Router
- Create pages:
  - Login
  - Signup
  - Onboarding
  - Dashboard
  - Preferences
- Create basic layout

Done when:
- Frontend runs locally.
- Routes are visible.

---

## Phase 10 — Frontend Authentication

Goal: connect login and signup to backend.

Tasks:
- Create `api.js`
- Create `authApi.js`
- Create `AuthContext`
- Implement login form
- Implement signup form
- Store JWT
- Add protected routes
- Add logout

Done when:
- User can sign up and log in from the frontend.

---

## Phase 11 — Frontend Onboarding

Goal: connect onboarding page to backend.

Tasks:
- Create onboarding form
- Submit preferences
- Redirect to dashboard
- Redirect new users to onboarding
- Redirect returning users to dashboard

Done when:
- Preferences are saved from frontend.
- Correct redirects work.

---

## Phase 12 — Frontend Dashboard

Goal: display personalized dashboard data.

Tasks:
- Create dashboard API service
- Fetch dashboard data
- Store the returned `section_content_ids` map in dashboard state
- Keep each displayed item's `content_item_id` available for voting
- Display market news
- Display coin prices
- Display AI insight
- Display meme
- Add loading and error states

Done when:
- Dashboard displays all four sections.
- The frontend has the identifiers needed to submit feedback votes.

---

## Phase 13 — Feedback System

Goal: save thumbs up/down votes.

Tasks:
- Add backend feedback endpoint
- Add feedback schema/service/repository
- Accept `section_type`, `content_item_id`, `vote`, and `content_snapshot`
- No FK to `daily_content` — votes are keyed by stable `content_item_id` only
- Use create-or-update behavior to avoid duplicate votes; votes survive cache invalidation
- Add frontend vote buttons
- Submit votes to backend
- Fetch all existing votes on dashboard load and restore active button state
- Show success state

Endpoints:
- `POST /api/feedback`
- `GET /api/feedback`

Done when:
- Votes are saved in PostgreSQL.
- Re-voting the same item updates the existing feedback record instead of creating duplicates.
- Vote state is restored correctly on page refresh.

---

## Phase 14 — UI Polish

Goal: make the app clean and presentable.

Tasks:
- Improve spacing
- Improve forms
- Improve dashboard cards
- Add responsive layout
- Add clear errors
- Add loading states
- Add disclaimer

Done when:
- The app looks clean on desktop and mobile.

---

## Phase 15 — Documentation

Goal: prepare the project for review.

Tasks:
- Complete `README.md`
- Complete `docs/ai_interactions_summary.md`
- Add DB access explanation
- Add future feedback/training explanation
- Add setup instructions

Done when:
- Another developer can understand and run the project.