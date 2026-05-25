# Project Context

## Overview

AI Crypto Advisor is a full stack web app that gives each user a personalized crypto dashboard.

The app should:
- Register and authenticate users.
- Ask new users a short onboarding quiz.
- Store user preferences.
- Display a daily crypto dashboard.
- Show market news, coin prices, AI insight, and a crypto meme.
- Let users vote thumbs up/down on each dashboard section.
- Store feedback for future recommendation improvements.

The goal is a clean MVP, not a large production system.

## Users

The app is for users interested in crypto content.  
They may be beginners, HODLers, day traders, NFT collectors, or research-focused investors.

## Core Flow

```text
Signup / Login
↓
Check onboarding status
↓
Complete onboarding if needed
↓
Open personalized dashboard
↓
View daily content
↓
Vote thumbs up/down
↓
Save feedback
```

## Main Features

### Authentication

- Signup with name, email, and password.
- Login with email and password.
- JWT protected routes.

### Onboarding

Ask:
1. Which crypto assets are you interested in?
2. What type of investor are you?
3. What kind of content would you like to see?

Save answers in PostgreSQL.

### Dashboard

Display four sections:
1. Market News
2. Coin Prices
3. AI Insight of the Day
4. Fun Crypto Meme

Each section should include voting.

### Feedback

Each vote should save:
- user ID
- section type
- vote value
- content ID
- timestamp

## MVP Scope

Must include:
- Signup
- Login
- Onboarding
- Dashboard
- PostgreSQL persistence
- Feedback voting
- External API integrations or fallback data
- Public deployment
- README
- AI usage summary

Do not include:
- Real trading
- Payments
- Complex ML model
- Admin panel
- Email verification
- Social login
- Portfolio tracking
- Financial advice

## External Data

Use:
- CoinGecko for coin prices
- CryptoPanic for market news, with fallback data
- OpenRouter or Hugging Face for AI insight, with fallback data
- Static meme list for memes

The dashboard must keep working even if external APIs fail.

## Submission Requirements

The final project should include:
- Public GitHub repository
- Deployed app URL
- DB access explanation
- AI tools usage summary
- Future feedback/training explanation
