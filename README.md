# QueueDesk — Ticket Support Queue

A full-stack support desk. Customers submit tickets, and agents triage them in a shared queue with SLA
tracking, internal notes and a full activity timeline.

- **Client:** React 18 + Vite + TypeScript, React Router, TanStack Query, Zustand, React Hook Form + Zod, Tailwind CSS
- **API:** Node.js + Express + TypeScript, Zod validation, JWT auth
- **Database:** SQLite via Prisma (a file DB, so there is no database server to install)
- **Tests:** Vitest + Supertest (API) and Vitest + React Testing Library + MSW (client)

Product docs: [PRD](docs/PRD.md) · [Flow charts (Mermaid)](docs/FLOW.md)

---

## Quick start

**Requirements:** Node.js 18.18 or newer (developed on Node 22) and npm 9+.

```bash
git clone <repo-url> queuedesk
cd queuedesk
npm install      # installs everything, creates server/.env, migrates and seeds the database
npm run dev      # starts the API on :4000 and the client on :5173
```

Open **http://localhost:5173** and sign in with a demo account. The login page also has
one-click buttons that fill these in.

| Role       | Email                     | Password       |
| ---------- | ------------------------- | -------------- |
| Agent      | `agent@queuedesk.test`    | `Password123!` |
| Admin      | `admin@queuedesk.test`    | `Password123!` |
| Agent 2    | `sam@queuedesk.test`      | `Password123!` |
| Customer   | `customer@queuedesk.test` | `Password123!` |
| Customer 2 | `jordan@queuedesk.test`   | `Password123!` |

> `npm install` runs `npm run setup` automatically (a `postinstall` hook). If you installed with
> `--ignore-scripts`, run `npm run setup` once yourself.

## Scripts (run from the repo root)

| Command             | What it does                                                                             |
| ------------------- | ---------------------------------------------------------------------------------------- |
| `npm run dev`       | API (watch mode) and client (Vite dev server) together                                   |
| `npm test`          | All API and client tests                                                                 |
| `npm run lint`      | ESLint across both workspaces                                                            |
| `npm run typecheck` | `tsc --noEmit` for both workspaces                                                       |
| `npm run build`     | Production build of the API (`server/dist`) and client (`client/dist`)                   |
| `npm start`         | Runs the built API and serves the built client with `vite preview`                       |
| `npm run setup`     | Creates `server/.env` if missing, generates the Prisma client, applies migrations, seeds |
| `npm run db:reset`  | Drops and re-creates the database with fresh seed data                                   |
| `npm run format`    | Prettier                                                                                 |

## What the app does

Two workflows and five screens besides login (see [docs/FLOW.md](docs/FLOW.md) for diagrams):

**Customer workflow:** register or sign in → **My Tickets** → **New Ticket** → **Ticket Detail**
(conversation, timeline, reply, close).

**Agent workflow:** sign in → **Dashboard** (active / unassigned / overdue / mine / resolved today,
breakdowns by status and priority) → **Queue** (search, filters, sort, pagination, all kept in the
URL) → **Ticket Detail** → claim → change status or priority → public reply or **internal note** → resolve.

Business rules (enforced by the API, covered by tests):

- **Status workflow:** `OPEN → IN_PROGRESS → PENDING → RESOLVED → CLOSED`. A resolved ticket can be
  re-opened. `CLOSED` is terminal. Invalid moves return `422`.
- **SLA:** due date is set from priority (Urgent 4h, High 24h, Medium 48h, Low 72h) and measured from
  creation. Active tickets past their due date are flagged **overdue**.
- **Claiming** an `OPEN` ticket moves it to `IN_PROGRESS`. A customer reply on a `PENDING` or `RESOLVED`
  ticket moves it back to `IN_PROGRESS`.
- **Access:** customers only see their own tickets (others return `404`) and never receive internal
  notes. Customers can only close their own ticket. Only admins can assign a ticket to another agent.
- **Audit trail:** every status, priority and assignment change is written to a `TicketEvent` in the
  same transaction as the change.

## Project structure

```
.
├── client/                      React + Vite SPA
│   └── src/
│       ├── app/                 App shell: router, query client, layouts
│       ├── routes/guards.tsx    ProtectedRoute, RoleRoute, RootRedirect
│       ├── components/ui/       Reusable UI kit (Button, Input, Select, Badge, Card, DataTable,
│       │                        Pagination, Modal, EmptyState, Spinner, FormField, Avatar)
│       ├── components/          Shared domain components (StatusBadge, PriorityBadge, SlaIndicator, PageHeader)
│       ├── features/
│       │   ├── auth/            api, Zustand session store, hooks, Login/Register pages + forms
│       │   ├── tickets/         api, query keys, hooks, filters-in-URL, table, form, activity feed, pages
│       │   └── dashboard/       stats query, StatCard, BreakdownBar, page
│       ├── lib/                 axios client + error handling, formatting, labels
│       ├── types/api.ts         API contract types
│       └── test/                MSW handlers, fixtures, render helpers
├── server/                      Express API
│   ├── prisma/                  schema, migrations, idempotent seed
│   ├── src/
│   │   ├── domain/              Pure business rules (state machine, SLA, permissions) and constants
│   │   ├── modules/             auth, tickets, users, stats — each has routes → controller → service (+ schema/mapper)
│   │   ├── middleware/          authenticate, authorize(roles), validate(zod), errorHandler, notFound
│   │   ├── lib/                 prisma client, jwt, password hashing
│   │   ├── config/env.ts        Validated env with safe defaults
│   │   ├── app.ts               createApp() (used by tests)
│   │   └── server.ts            listen()
│   └── tests/                   unit/ (rules, schemas) and integration/ (supertest on a throwaway SQLite DB)
└── docs/                        PRD.md, FLOW.md
```

### State management

| Kind of state                        | Where it lives                                                                                                               |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| Server data (tickets, stats, users)  | **TanStack Query**: caching, background refetch, invalidation after writes, optimistic status/priority updates with rollback |
| Auth session (token + user)          | **Zustand** store persisted to `localStorage`, re-validated with `GET /auth/me` on load                                      |
| Queue filters / search / sort / page | **URL search params**: shareable, back/forward works, dashboard cards deep-link into filtered queues                         |
| Form state                           | **React Hook Form** + Zod schemas that mirror the API's validation                                                           |

## API reference

Base URL `http://localhost:4000/api`. Authenticated routes need `Authorization: Bearer <token>`.
Errors always have the shape `{ "error": { "code", "message", "details?" } }`.

| Method | Path                    | Access                       | Notes                                                                                                                                                                                                                 |
| ------ | ----------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/health`               | public                       | liveness                                                                                                                                                                                                              |
| POST   | `/auth/register`        | public                       | creates a **customer**; returns `{ token, user }`                                                                                                                                                                     |
| POST   | `/auth/login`           | public                       | returns `{ token, user }`                                                                                                                                                                                             |
| GET    | `/auth/me`              | any                          | current user                                                                                                                                                                                                          |
| GET    | `/tickets`              | any                          | `status` (incl. `ACTIVE`), `priority`, `category`, `assignee` (`me`/`unassigned`/id), `overdue`, `q`, `sort` (`newest`/`oldest`/`priority`/`dueAt`), `page`, `pageSize` (≤ 50). Customers only get their own tickets. |
| POST   | `/tickets`              | any                          | `{ title, description, category, priority? }`                                                                                                                                                                         |
| GET    | `/tickets/:id`          | owner or staff               | includes comments, events and `allowedTransitions` for the caller                                                                                                                                                     |
| PATCH  | `/tickets/:id`          | staff (customer: close only) | `{ status?, priority?, assigneeId? }`                                                                                                                                                                                 |
| POST   | `/tickets/:id/assign`   | staff                        | claim for yourself                                                                                                                                                                                                    |
| POST   | `/tickets/:id/comments` | owner or staff               | `{ body, isInternal? }`. Internal notes are staff only.                                                                                                                                                               |
| GET    | `/users?role=STAFF`     | staff                        | assignee options                                                                                                                                                                                                      |
| GET    | `/stats/summary`        | staff                        | dashboard KPIs                                                                                                                                                                                                        |

Example:

```bash
TOKEN=$(curl -s -X POST localhost:4000/api/auth/login -H "Content-Type: application/json" \
  -d '{"email":"agent@queuedesk.test","password":"Password123!"}' | node -pe "JSON.parse(require('fs').readFileSync(0)).token")
curl -s "localhost:4000/api/tickets?status=ACTIVE&sort=priority" -H "Authorization: Bearer $TOKEN"
```

## Testing

```bash
npm test                       # everything
npm run test -w server         # API: unit + integration (uses server/prisma/test.db, recreated each run)
npm run test -w client         # client: components, hooks, pages with mocked API (MSW)
```

The API integration tests run the real Express app against a fresh, migrated SQLite database. They
cover auth, access control (including internal-note privacy), the full triage workflow, invalid
transitions, SLA recalculation, filtering and pagination, and stats.

## Configuration

`server/.env` is created from [`server/.env.example`](server/.env.example) on install. Every value has a
safe default, so the API also runs without the file.

| Variable         | Default                 | Purpose                                   |
| ---------------- | ----------------------- | ----------------------------------------- |
| `PORT`           | `4000`                  | API port (the Vite proxy expects 4000)    |
| `DATABASE_URL`   | `file:./dev.db`         | SQLite file, relative to `server/prisma/` |
| `JWT_SECRET`     | dev value               | **Change it for any real deployment**     |
| `JWT_EXPIRES_IN` | `8h`                    | Token lifetime                            |
| `CORS_ORIGIN`    | `http://localhost:5173` | Allowed origins (comma-separated)         |

In development the client calls `/api` on its own origin, and Vite proxies it to `localhost:4000`, so
no client env is needed. To point the client somewhere else, set `VITE_API_URL`.

## Troubleshooting

- **`EADDRINUSE :4000` or `:5173`:** another process is using the port. Stop it, or change `PORT`
  (and the proxy target in `client/vite.config.ts`).
- **Want a clean slate?** Run `npm run db:reset`.
- **Prisma engine download blocked by a proxy:** run `npm run setup` again once network access works.
