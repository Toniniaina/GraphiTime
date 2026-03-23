# AGENTS.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

**GraphiTime** is a school timetable management system for Malagasy schools. It uses a graph-coloring / constraint-satisfaction approach (Google OR-Tools CP-SAT) to auto-generate conflict-free weekly schedules for professors, classes, and rooms.

Stack: Python FastAPI + Strawberry GraphQL backend, React 19 + TypeScript + Vite frontend, PostgreSQL database.

---

## Commands

### Backend

```bash
# From backend/
.\.venv\Scripts\activate          # Windows — activate virtualenv
pip install -r requirements.txt

uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

The backend reads its configuration from `backend/.env`:
```
DATABASE_URL=postgresql://postgres:admin@127.0.0.1:5432/graphitime
CORS_ORIGINS=http://127.0.0.1:5173,http://localhost:5173
```

### Frontend

```bash
# From frontend/
npm install
npm run dev        # dev server with HMR (proxies /graphql and /planning/* to :8000)
npm run build      # tsc -b && vite build
npm run lint       # eslint
```

### Database

```bash
# Run once to initialize (requires PostgreSQL with btree_gist extension available)
psql -U postgres -f db/schema.sql
```

> **Note**: `db/schema.sql` reflects the initial schema. The live database has `school_id VARCHAR(16)` FK columns added to `professors`, `classes`, `subjects`, `rooms`, `courses`, `professor_unavailability`, and `scheduled_sessions` — enabling multi-tenancy. These ALTER TABLE additions are not in schema.sql.

There are no automated tests yet.

---

## Architecture

### Repository Layout

```
backend/app/     — FastAPI application
  main.py        — app factory, REST endpoints (health, CSV export/import)
  settings.py    — pydantic Settings loaded from .env
  db/pool.py     — psycopg connection pool (min=1, max=10)
  graphql/       — Strawberry schema (schema.py, queries.py, mutations.py, types.py, context.py)
  repositories/  — raw SQL via psycopg (auth, professor, school)
  services/      — business logic (auth, professor, school, scheduling)
db/              — schema.sql, schema_doc.md, seed_data.sql
frontend/src/
  main.tsx                   — entry point, BrowserRouter wrapping AppEduPlan
  AppEduPlan.tsx             — active app: holds all state, all GraphQL calls, all CRUD handlers
  App.tsx                    — legacy prototype (static mock data, no backend connection, not used)
  components/eduplan/        — page components (Planning, Classes, Teachers, Rooms, Subjects, Settings, Auth, Algo)
  components/eduplan/types.ts — shared TypeScript types (DbClass, DbCourse, DbRoom, …)
  components/eduplan/data.ts  — constants (DAYS, NAV_ITEMS, SUBJECT_COLORS)
```

### Frontend State Management

There is no GraphQL client library (no Apollo, no urql). All data fetching is done via a hand-rolled `graphql<T>(query, variables?)` helper in `AppEduPlan.tsx` that POSTs JSON to `/graphql` with the session cookie.

All application state (professors, classes, rooms, subjects, courses, scheduledSessions, professorUnavailability, me) lives in `AppEduPlan.tsx`. After every mutation, `refreshAll()` re-fetches all data from the backend in a single large GraphQL query.

Page components receive data and handler callbacks as props — they are stateless relative to the backend. The Vite dev server proxies `/graphql`, `/planning/export.csv`, and `/planning/import.csv` to the backend on port 8000.

### Backend Layers

The backend follows a strict layered pattern:
- **GraphQL layer** (`app/graphql/`) — Strawberry types, queries, mutations; calls services.
- **Services** (`app/services/`) — business logic; calls repositories.
- **Repositories** (`app/repositories/`) — raw SQL via psycopg; return plain tuples.

The `GraphQLContext` carries `request`, `response`, and `db_pool`. All GraphQL resolvers and REST handlers call `_require_school_id()` to extract and validate the session before touching data.

### Multi-Tenancy

Every entity table has a `school_id` column (added post-initial schema). All repository queries always `WHERE school_id = %s`. A school account is a 1-to-1 relationship (`school_accounts.school_id UNIQUE`), so each login maps to exactly one tenant.

### Authentication

Sessions use an HttpOnly cookie named `gt_session`. The session token is a URL-safe random string; only its SHA-256 hash is stored in `auth_sessions.token_hash`. `AuthService.me_from_session_token()` is called on every authenticated request. Sessions expire after 30 days; `revoked_at` is set on logout.

### Scheduling Algorithm (`app/services/scheduling_service.py`)

`SchedulingService` uses **Google OR-Tools CP-SAT** (not a simple greedy algorithm despite the docstring). For a given school:

1. Courses are decomposed into session blocks: "Étude" becomes 1h blocks; all other subjects become 2h or 3h blocks.
2. Available time slots per class are generated across Mon–Fri, in two windows: 06:00–12:00 and 14:00–18:00 (normal hours 07:00–12:00 and 14:00–17:00; outside is penalized heavily).
3. CP-SAT hard constraints: each task assigned exactly once; at most one task per slot per class; no overlapping slots for same class/professor on the same day; professor availability windows.
4. Soft objectives (cost minimization): earlier slots preferred, lunch overlap penalized (500k), holes in the day penalized (10k), excessive consecutive hours per subject penalized (15k).
5. Solver timeout: 20 seconds, up to 8 parallel workers.
6. Prerequisite: every class must have `home_room_id` set before scheduling can run.

`generate_preview()` / `generate_preview_detailed()` returns in-memory `GeneratedSessionRow` objects (not persisted). `apply_generated_schedule()` truncates `scheduled_sessions` and bulk-inserts the preview. Sessions can also be manually moved via `moveScheduledSession` mutation (conflict-checked in Python before the SQL UPDATE).

### Database Conflict Enforcement

PostgreSQL `EXCLUDE USING gist` constraints on `scheduled_sessions` prevent overlapping sessions for the same professor, class, or room on the same day. The `btree_gist` extension is required. Session times are stored as minutes-since-midnight integers (`start_minute`, `end_minute`); max session length is 4h (240 minutes).

### ID Format

All primary keys are prefixed VARCHAR(16) generated by sequences:
`SCH00001` (schools), `ACC00001` (accounts), `SSN00001` (auth sessions), `PRF00001` (professors), `CLS00001` (classes), `SUB00001` (subjects), `ROM00001` (rooms), `CRS00001` (courses), `UNV00001` (unavailability), `SES00001` (scheduled sessions).

### CSV / XLSX Export-Import

The REST endpoints `GET /planning/export.csv` and `POST /planning/import.csv` handle bulk planning data. The frontend also has a client-side XLSX export using `xlsx-js-style` (no backend involvement). Importing an `.xlsx` converts it to CSV client-side before posting.

### Legacy `App.tsx`

`frontend/src/App.tsx` is an older prototype with fully static mock data and no backend connection. It is not mounted in `main.tsx` (which uses `AppEduPlan`). Keep it around as a reference but do not add features to it.
