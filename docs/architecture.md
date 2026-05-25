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

Notes:
- `id` is the primary key
- `email` must be unique and indexed
- `hashed_password` stores a hashed password only, never the raw password

### user_preferences

Stores onboarding answers for each user.

Fields:
- id
- user_id
- interested_assets
- investor_type
- content_types
- created_at
- updated_at

Notes:
- `user_id` references `users.id`
- `user_id` should be unique, because each user has one active preferences record
- `interested_assets` should be stored as JSON/array data
- `content_types` should be stored as JSON/array data

### daily_content

Stores a daily dashboard snapshot for each user.

Fields:
- id
- user_id
- date
- market_news
- coin_prices
- ai_insight
- meme
- created_at
- updated_at

Notes:
- `user_id` references `users.id`
- `market_news`, `coin_prices`, and `meme` should be stored as JSON
- `ai_insight` can be stored as text or JSON
- Add a unique constraint on `user_id` and `date`
- This table is used for caching, reducing external API calls, and preserving the exact content shown to the user

### feedback

Stores thumbs up/down votes for specific content items shown in the user's daily dashboard.

Fields:
- id
- user_id
- daily_content_id
- section_type
- content_item_id
- vote
- created_at
- updated_at

Allowed `section_type` values:
- `market_news`
- `coin_prices`
- `ai_insight`
- `meme`

Allowed `vote` values:
- `up`
- `down`

Notes:
- `user_id` references `users.id`
- `daily_content_id` references `daily_content.id`
- `content_item_id` identifies the specific item inside the selected dashboard section
- Add a unique constraint on `user_id`, `daily_content_id`, `section_type`, and `content_item_id`
- This allows the user to update an existing vote instead of creating duplicate feedback records
- The displayed content snapshot is stored in `daily_content`, so `feedback` does not need to duplicate the full content payload
- This structure allows future recommendation models to understand which displayed content users liked or disliked

### Database Relationships

```text
users.id -> user_preferences.user_id
users.id -> daily_content.user_id
users.id -> feedback.user_id
daily_content.id -> feedback.daily_content_id
```

Recommended indexes and constraints:
- `users.email` unique index
- `user_preferences.user_id` unique index
- `daily_content(user_id, date)` unique constraint
- `feedback(user_id, daily_content_id, section_type, content_item_id)` unique constraint

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

Expected payload includes:
- `daily_content_id`
- `section_type`
- `content_item_id`
- `vote`

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
Check if daily_content exists for the current user and date
↓
If cached content exists, return it
↓
If not, get coin prices, market news, AI insight, and meme
↓
Save the generated dashboard snapshot in daily_content
↓
Return dashboard response with daily_content_id and content item IDs
```

## Feedback Flow

```text
Get current user
↓
Receive vote with daily_content_id, section_type, content_item_id, and vote
↓
Validate that the daily_content record belongs to the current user
↓
Create or update the feedback record using the unique feedback constraint
↓
Return success response
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
