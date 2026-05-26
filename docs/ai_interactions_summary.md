# AI Interactions Summary

## Purpose

This document describes how AI tools were used during the development of AI Crypto Advisor.

---

## Tools Used

### Claude Code (Anthropic)

Claude Code was the primary AI tool used throughout the project. It was used interactively via the Claude Code CLI inside the project workspace.

**Planning and architecture**
- Helped analyze the task requirements and clarify the scope of the MVP
- Assisted in designing the layered backend architecture: routes → services → repositories → models
- Helped plan the database schema, including the `daily_content` caching design and the `feedback` uniqueness constraint
- Helped organize the implementation into sequential phases with clear done-when criteria

**Implementation guidance**
- Implemented each backend layer (models, schemas, repositories, services, routes) across all phases
- Implemented the full authentication system: bcrypt hashing, JWT creation and validation, protected route dependency
- Implemented the dashboard caching logic: one snapshot per user per day, with cache-miss fetch from external APIs and cache-hit return from PostgreSQL
- Implemented the AI insight provider chain: OpenRouter → Hugging Face → static fallback, with per-model retry and safe logging
- Implemented the feedback upsert pattern using the unique constraint `(user_id, daily_content_id, section_type, content_item_id)`
- Implemented the full frontend: React pages, protected and public routes, auth context, API service modules, and the fintech terminal design system
- Implemented Docker support: Dockerfiles, `.dockerignore` files, and the full `docker-compose.yml` with health checks

**Debugging and code review**
- Identified and fixed a write-only dashboard cache (cache was saved but never read on subsequent loads)
- Identified and fixed a stale closure bug in React state toggle handlers (`setState(value)` vs `setState(prev => ...)`)
- Identified and removed dead code: unused `get_current_user` in auth service, unused constants in the feedback model, a duplicate frontend map
- Identified and fixed an incorrect 201 status code on the upsert preferences endpoint
- Identified and fixed a cache invalidation gap: updating preferences now deletes today's `daily_content` row so Coin Prices reflects the new asset selection
- Helped reconstruct `data_sources` labels from cached content using stable heuristics (no extra DB column needed)

**Documentation**
- Wrote and updated `docs/implementation_progress.md` after every completed phase and bug fix
- Wrote `README.md` for the final submission

---

## Human Review

All AI-generated code was reviewed before acceptance. Key decisions made or verified manually:

- Final selection of the AI provider fallback chain (OpenRouter → Hugging Face → static)
- Decision to store `data_sources` as inferred labels rather than a persisted DB column (avoids a migration)
- Decision to cascade-delete today's feedback rows when preferences change (acceptable MVP trade-off)
- Scope decisions for each phase: what was in and what was explicitly deferred
- Confirmation that no secrets, API keys, or `.env` files were committed

---

## Notes

- No real API keys or secrets appear in this repository
- The `backend/.env` and `frontend/.env` files are excluded by `.gitignore`
- `.env.example` files contain only placeholder values and are safe to commit
