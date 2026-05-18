# TaskFlow — Team Task Manager

A full-stack collaborative task management app (simplified Trello/Asana).

**Stack:** React + Vite · Node.js + Express · PostgreSQL + Prisma · shadcn/ui + Tailwind · Deployed on Railway

---

## Features

- JWT authentication (register / login)
- Project management with Admin & Member roles
- Kanban board with To Do / In Progress / Done columns
- Task creation with title, description, due date, priority, assignee
- Role-based access — only admins can create/edit/delete tasks and manage members
- Dashboard with stats cards and charts (tasks by status, tasks per member)
- Seed data for quick testing

---

## Local Setup

### Prerequisites
- Node.js 18+
- A PostgreSQL database (e.g. [Neon](https://neon.tech) free tier)

### Backend

```bash
cd backend
cp .env.example .env
# Fill in DATABASE_URL, JWT_SECRET in .env
npm install
npx prisma migrate dev --name init
node prisma/seed.js      # optional: load demo data
npm run dev              # starts on http://localhost:5000
```

### Frontend

```bash
cd frontend
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api (or leave blank to use Vite proxy)
npm install
npm run dev              # starts on http://localhost:5173
```

---

## Seed Accounts

After running `node prisma/seed.js`:

| Email | Password | Role |
|---|---|---|
| alice@example.com | password123 | Admin |
| bob@example.com | password123 | Member |
| carol@example.com | password123 | Member |

---

## API Reference

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | — | Create account |
| POST | `/api/auth/login` | — | Login, returns JWT |
| GET | `/api/auth/me` | JWT | Current user |
| GET | `/api/projects` | JWT | List my projects |
| POST | `/api/projects` | JWT | Create project (caller becomes Admin) |
| GET | `/api/projects/:id` | Member | Project detail + members |
| PUT | `/api/projects/:id` | Admin | Update project |
| DELETE | `/api/projects/:id` | Admin | Delete project |
| POST | `/api/projects/:id/members` | Admin | Add member by email |
| DELETE | `/api/projects/:id/members/:userId` | Admin | Remove member |
| GET | `/api/projects/:id/tasks` | Member | List tasks |
| POST | `/api/projects/:id/tasks` | Admin | Create task |
| PUT | `/api/projects/:id/tasks/:taskId` | Admin | Edit task |
| PATCH | `/api/projects/:id/tasks/:taskId/status` | Member | Update status (own tasks only for members) |
| DELETE | `/api/projects/:id/tasks/:taskId` | Admin | Delete task |
| GET | `/api/dashboard/stats` | JWT | Aggregate stats |

---

## Railway Deployment

### 1. Create a Railway project and add services

- **PostgreSQL** plugin (Railway native) — auto-injects `DATABASE_URL`
- **Backend** service (root: `/backend`)
- **Frontend** service (root: `/frontend`)

### 2. Backend environment variables

```
DATABASE_URL=<from Railway PostgreSQL plugin>
JWT_SECRET=<strong random string>
PORT=5000
FRONTEND_URL=<your Railway frontend URL>
```

Start command:
```
npx prisma migrate deploy && node server.js
```

### 3. Frontend environment variables

```
VITE_API_URL=<your Railway backend URL>/api
```

Build command: `npm run build`  
Start command: `npx serve dist`

### 4. After first deploy

The `prisma migrate deploy` in the start command automatically applies all migrations.
Optionally SSH into the backend service and run:
```bash
node prisma/seed.js
```

---

## Project Structure

```
team-task-manager/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma     # Data models
│   │   └── seed.js           # Demo seed data
│   ├── src/
│   │   ├── config/db.js      # Prisma singleton
│   │   ├── controllers/      # Business logic
│   │   ├── middleware/        # JWT auth + role guards
│   │   ├── routes/            # Express routers
│   │   └── utils/errors.js   # AppError + asyncHandler
│   └── server.js
└── frontend/
    └── src/
        ├── api/client.js      # Axios + auth interceptors
        ├── components/        # Navbar, TaskCard, TaskForm, MemberManager
        ├── pages/             # Login, Register, Dashboard, Projects, ProjectDetail
        └── store/authStore.js # Zustand auth state (persisted)
```
