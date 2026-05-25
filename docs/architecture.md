# Architecture

## High-Level Architecture

```text
React Frontend
↓ HTTP / JSON
FastAPI Backend
↓
Services Layer
↓
PostgreSQL + External APIs
```

## Backend Structure

```text
backend/
├── app/
│   ├── main.py
│   ├── core/
│   │   ├── config.py
│   │   ├── database.py
│   │   └── security.py
│   ├── models/
│   ├── schemas/
│   ├── routes/
│   ├── services/
│   ├── repositories/
│   └── utils/
├── alembic/
├── requirements.txt
├── .env.example
└── Dockerfile
```

## Backend Layers

### Routes

Handle HTTP requests and responses.

Examples:
- `auth.py`
- `onboarding.py`
- `dashboard.py`
- `feedback.py`

### Schemas

Define Pydantic request and response models.

Examples:
- `auth.py`
- `user.py`
- `preference.py`
- `dashboard.py`
- `feedback.py`

### Services

Contain business logic.

Examples:
- `auth_service.py`
- `onboarding_service.py`
- `dashboard_service.py`
- `coin_service.py`
- `news_service.py`
- `ai_service.py`
- `meme_service.py`
- `feedback_service.py`

### Repositories

Handle database queries.

Examples:
- `user_repository.py`
- `preference_repository.py`
- `feedback_repository.py`
- `daily_content_repository.py`

### Models

Define SQLAlchemy tables.

Examples:
- `user.py`
- `preference.py`
- `feedback.py`
- `daily_content.py`

## Frontend Structure

```text
frontend/
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   ├── pages/
│   ├── components/
│   ├── services/
│   ├── context/
│   └── styles/
├── package.json
├── .env.example
└── vite.config.js
```

## Database Design

### users

Stores registered users.

Fields:
- id
- name
- email
- hashed_password
- created_at
- updated_at

### user_preferences

Stores onboarding answers.

Fields:
- id
- user_id
- interested_assets
- investor_type
- content_types
- created_at
- updated_at

### feedback

Stores thumbs up/down votes.

Fields:
- id
- user_id
- section_type
- vote
- content_id
- created_at

Allowed `section_type` values:
- `market_news`
- `coin_prices`
- `ai_insight`
- `meme`

Allowed `vote` values:
- `up`
- `down`

### daily_content

Optional table for caching daily dashboard content.

Fields:
- id
- user_id
- date
- market_news
- coin_prices
- ai_insight
- meme
- created_at

## API Design

Base path:

```text
/api
```

### Health

```http
GET /health
```

### Auth

```http
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
```

### Onboarding

```http
GET /api/onboarding/preferences
POST /api/onboarding/preferences
```

### Dashboard

```http
GET /api/dashboard
```

### Feedback

```http
POST /api/feedback
```

## Authentication Flow

```text
User submits credentials
↓
Backend validates user
↓
Backend returns JWT
↓
Frontend stores token
↓
Frontend sends Authorization header
↓
Backend protects private routes
```

Header:

```http
Authorization: Bearer <token>
```

## Dashboard Flow

```text
Get current user
↓
Load preferences
↓
Get coin prices
↓
Get market news
↓
Generate AI insight
↓
Select meme
↓
Return dashboard response
```

## Error Handling

Handle:
- Duplicate email
- Invalid credentials
- Missing token
- Invalid token
- Missing onboarding preferences
- External API failure
- Invalid feedback value
- Database errors

## Deployment

Recommended:
- Frontend: Vercel
- Backend: Render
- Database: Neon or Supabase PostgreSQL
