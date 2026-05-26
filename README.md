# AI Crypto Advisor

A full-stack web application that provides a personalized daily crypto dashboard for each user.

## Features

- User registration and authentication (JWT)
- Onboarding quiz to capture investor preferences
- Personalized dashboard with:
  - Live coin prices (CoinGecko)
  - Market news (CryptoPanic)
  - AI-generated daily insight (OpenRouter / Hugging Face)
  - Fun crypto meme
- Thumbs up / down voting on each dashboard section
- Feedback stored in PostgreSQL for future recommendation improvements

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite |
| Backend | FastAPI + Python |
| Database | PostgreSQL |
| ORM | SQLAlchemy |
| Migrations | Alembic |
| Auth | JWT + bcrypt |
| Deployment | Vercel + Render + Neon/Supabase |

## Project Structure

```
.
├── backend/          # FastAPI application
├── frontend/         # React + Vite application
├── docs/             # Project documentation
├── docker-compose.yml
├── .gitignore
└── README.md
```

## Getting Started

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker (optional, for local PostgreSQL)

### Backend

```bash
cd backend
python -m venv .venv
# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload
```

### Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

### Full Stack (Docker)

```bash
# Build and start PostgreSQL + backend + frontend
docker-compose up -d --build

# View logs
docker-compose logs -f

# Stop everything
docker-compose down
```

Services exposed on the host:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- PostgreSQL: localhost:5433

### PostgreSQL only (for local non-Docker development)

```bash
docker-compose up -d postgres
```

## Documentation

- [Project Context](docs/project_context.md)
- [Architecture](docs/architecture.md)
- [Implementation Plan](docs/implementation_plan.md)
- [Implementation Progress](docs/implementation_progress.md)
- [AI Interactions Summary](docs/ai_interactions_summary.md)

## Disclaimer

This app is for informational and educational purposes only. It does not constitute financial advice.
