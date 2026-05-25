# Implementation Plan

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
- Add unique constraint for `feedback.user_id` + `feedback.daily_content_id` + `feedback.section_type` + `feedback.content_item_id`
- Add foreign keys between users, preferences, daily content, and feedback
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
- Return `daily_content_id` and stable content item IDs for feedback voting

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
- Connect CryptoPanic for news
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
- Store the returned `daily_content_id` in dashboard state
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
- Accept `daily_content_id`, `section_type`, `content_item_id`, and `vote`
- Validate that the `daily_content` record belongs to the current user
- Use create-or-update behavior to avoid duplicate votes
- Add frontend vote buttons
- Submit votes to backend
- Show success state

Endpoint:
- `POST /api/feedback`

Done when:
- Votes are saved in PostgreSQL.
- Re-voting the same item updates the existing feedback record instead of creating duplicates.

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

---

## Phase 16 — Deployment

Goal: deploy the full app.

Tasks:
- Deploy PostgreSQL
- Deploy FastAPI backend
- Deploy React frontend
- Set environment variables
- Test production flow

Done when:
- Public app URL works.
- Signup, onboarding, dashboard, and voting work in production.

---

## Phase 17 — Final Testing

Goal: verify the app before submission.

Checklist:
- Signup works
- Login works
- Onboarding works
- Dashboard loads
- Votes save to DB
- External APIs or fallbacks work
- README is complete
- AI summary is complete
- `.env` is not committed
