# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Backend (`cd backend`)
```bash
npm run dev          # nodemon on port 5000
npm test             # jest --runInBand --forceExit (hits real DB, needs DATABASE_URL)
npm run lint         # eslint
npx prisma migrate dev --name <name>   # create + apply migration
npm run seed         # load demo data
npx prisma studio    # DB GUI
```

### Frontend (`cd frontend`)
```bash
npm run dev          # vite on port 8080 (proxies /api → localhost:5000)
npm test             # vitest run (jsdom, one-shot)
npm run test:watch   # vitest interactive
npm run lint         # eslint src
npm run build        # vite build → dist/
```

### Running a single test
```bash
# Backend — Jest name filter
cd backend && npx jest --testPathPattern=tasks --runInBand

# Frontend — Vitest file filter
cd frontend && npx vitest run src/__tests__/TaskCard.test.jsx
```

## Architecture

### Backend (Node.js / Express / Prisma)

`server.js` exports the Express `app` (does not call `listen` when `NODE_ENV=test`), making it directly importable by Supertest.

Request flow: `routes/` → `middleware/auth.js` (JWT verify) + `middleware/requireRole.js` (ADMIN/MEMBER guard) → `controllers/` → Prisma → PostgreSQL.

`src/utils/errors.js` provides `AppError` (statusCode + message) and `asyncHandler` — all controller functions are wrapped with `asyncHandler` so thrown errors flow to the global error handler in `server.js`.

`src/config/db.js` is a Prisma client singleton (re-used across the process; tests import it directly for `beforeAll`/`afterAll` cleanup).

**Role model:** a `ProjectMember` join table holds `role: ADMIN | MEMBER` per project. The creator of a project is auto-added as ADMIN. `requireRole('ADMIN')` reads `req.projectRole` set by a prior middleware that resolves project membership from `req.params.id`.

**Task status transitions:** any member can PATCH their own task's status; only ADMINs can create/edit/delete tasks or change assignee.

### Frontend (React 18 / Vite / TanStack Query / Zustand)

`src/api/client.js` — Axios instance. Request interceptor reads `localStorage['auth']` (Zustand persist key) and injects `Authorization: Bearer`. Response interceptor redirects to `/login` on 401.

`src/store/authStore.js` — Zustand store persisted under key `auth`. Shape: `{ user, token, setAuth, clearAuth }`.

`@` is aliased to `src/` (configured in `vite.config.js`).

UI primitives live in `src/components/ui/` (shadcn/ui wrappers around Radix). Domain components (`TaskCard`, `TaskForm`, `MemberManager`, `Navbar`) compose these. Pages (`Dashboard`, `Projects`, `ProjectDetail`, `Login`, `Register`) use TanStack Query for server state.

The kanban board (`ProjectDetail`) uses `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop between TODO / IN_PROGRESS / DONE columns.

### Database schema (key relations)
- `User` ←→ `Project` via `ProjectMember` (composite PK `[projectId, userId]`, cascades on delete)
- `Task` belongs to `Project` (cascade delete), optionally assigned to a `User`
- Enums: `Role {ADMIN, MEMBER}`, `TaskStatus {TODO, IN_PROGRESS, DONE}`, `Priority {LOW, MEDIUM, HIGH}`

## Railway Backend Deployment

### 1. Create services

In your Railway project dashboard:
- Add a **PostgreSQL** plugin — Railway injects `DATABASE_URL` automatically into services in the same project.
- Add a **GitHub repo** service, set the **Root Directory** to `/backend`.

### 2. Environment variables

Set these in the backend service's Variables tab:

| Variable | Value |
|---|---|
| `DATABASE_URL` | Auto-injected by the PostgreSQL plugin (reference variable: `${{Postgres.DATABASE_URL}}`) |
| `JWT_SECRET` | A strong random string (e.g. `openssl rand -hex 32`) |
| `PORT` | `5000` |
| `FRONTEND_URL` | Your Railway frontend public URL (needed for CORS) |

### 3. Build & start commands

In the backend service settings:

```
Build command:   npm install && npx prisma generate
Start command:   npx prisma migrate deploy && node server.js
```

`prisma migrate deploy` applies any pending migrations on every deploy without prompting. `prisma generate` produces the Prisma client from `schema.prisma` at build time.

### 4. First deploy checklist

1. Trigger a deploy — watch logs to confirm migrations run and `Server running on port 5000` appears.
2. Check `GET /api/health` on the public URL returns `{"status":"ok"}`.
3. (Optional) Open a Railway shell on the backend service and run `node prisma/seed.js` to load demo users.

### 5. Subsequent schema changes

1. Locally: `cd backend && npx prisma migrate dev --name <description>` — commits a new migration file to `prisma/migrations/`.
2. Push to GitHub — Railway redeploys and `prisma migrate deploy` applies the new migration automatically.

Never run `prisma migrate dev` in production; it can reset data. Always use `prisma migrate deploy` there.

### Testing approach
- **Backend:** Supertest integration tests against a real PostgreSQL DB. Each test file uses timestamped emails to avoid collisions and cleans up via `prisma.user.deleteMany` in `afterAll`.
- **Frontend:** Vitest + jsdom + `@testing-library/react`. Axios is mocked at the module level; Zustand stores are reset between tests.
