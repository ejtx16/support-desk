# QueueDesk — Product Requirements Document (MVP)

| | |
|---|---|
| **Product** | QueueDesk: ticket support queue |
| **Version** | MVP 1.0 |
| **Status** | In development |
| **Timeline** | 3 days |
| **Stack** | React + Vite (TypeScript) client · Node.js / Express (TypeScript) REST API · SQLite via Prisma |
| **Related** | [Flow charts](./FLOW.md) · [README](../README.md) |

---

## 1. Problem

Small support teams take requests through email, chat and DMs. Tickets get lost,
nobody knows who owns a request, urgent issues sit next to trivial ones, and there is
no record of what happened. Customers can't see the status of their request, so they
follow up again and add more noise.

## 2. Solution

QueueDesk is one shared queue for support requests:

- **Customers** submit a ticket, track its status and talk with the support team in one thread.
- **Agents** work a prioritized queue: they claim tickets, set status and priority, reply
  publicly or leave internal notes, and resolve.
- Every ticket gets an **SLA due date** based on its priority, and overdue work is flagged.
- Every change is written to an **activity timeline**, so nothing happens without a record.

## 3. Goals and non-goals

### MVP goals
1. A customer can go from login to a submitted ticket in under a minute.
2. An agent can find the most urgent unowned work in one click from the dashboard.
3. Access rules hold: customers only see their own tickets and never see internal notes.
4. The app runs on a fresh clone with `npm install` then `npm run dev`. No manual DB setup.

### Non-goals (post-MVP)
Email/Slack notifications, file attachments, real-time updates (websockets), multi-tenant
workspaces, SLA business-hours calendars, canned responses, CSAT surveys, knowledge base.

## 4. Users and roles

| Role | Who | Key needs |
|---|---|---|
| `CUSTOMER` | Person asking for help | Submit requests, see status, reply, close when done |
| `AGENT` | Support staff | See the whole queue, prioritize, own tickets, communicate, resolve |
| `ADMIN` | Team lead | Everything an agent can do, plus assign tickets to any agent |

## 5. MVP scope: workflows and screens

Login is excluded from the exam's "2 workflows / 4 screens" count. The MVP ships
**2 workflows** and **5 screens** besides login.

### Workflow A: Customer request
`Login / Register → My Tickets → Create Ticket → Ticket Detail (reply / close)`

### Workflow B: Agent triage
`Login → Dashboard → Queue (filter/search/sort) → Ticket Detail → Claim → Update status/priority → Reply / internal note → Resolve`

### Screens

| # | Screen | Route | Roles | Purpose |
|---|---|---|---|---|
| 0 | Login | `/login` | Public | Sign in (demo accounts listed) |
| 0b | Register | `/register` | Public | Self-service customer signup |
| 1 | Dashboard | `/dashboard` | Agent, Admin | Queue health KPIs + shortcuts into filtered queues |
| 2 | Ticket Queue / My Tickets | `/tickets` | All (scoped) | Filterable, searchable, paginated ticket list |
| 3 | Create Ticket | `/tickets/new` | All | Submit a new request |
| 4 | Ticket Detail | `/tickets/:ticketId` | Owner, Agent, Admin | Conversation, timeline, actions |
| 5 | Not Found | `*` | All | Friendly 404 |

See [FLOW.md](./FLOW.md) for flowcharts of both workflows and the status state machine.

## 6. User stories and acceptance criteria

### Authentication
- **US-1** As a user, I can log in with email and password.
  - Wrong credentials show "Invalid email or password". The message does not say which one was wrong.
  - After login I go to `/dashboard` (staff) or `/tickets` (customer).
  - My session survives a page reload. Logging out clears it.
- **US-2** As a new customer, I can register with name, email and password.
  - Password needs at least 8 characters with a letter and a number. Duplicate emails are rejected.
- **US-3** As a user, I can't open pages my role doesn't allow.
  - Signed-out users are sent to `/login` and returned to the page they asked for after logging in.
  - A customer opening `/dashboard` is redirected to `/tickets`.

### Customer workflow
- **US-4** As a customer, I can create a ticket with title, description, category and priority.
  - Validation errors show inline. On success I land on the new ticket's detail page.
  - The ticket starts `OPEN` with number `#1001+` and a due date set by priority.
- **US-5** As a customer, I see only my own tickets, with status, priority and last update.
- **US-6** As a customer, I can reply on my ticket.
  - If the ticket is `PENDING` or `RESOLVED`, my reply moves it back to `IN_PROGRESS`.
- **US-7** As a customer, I can close my own ticket. A closed ticket is read-only.

### Agent workflow
- **US-8** As an agent, the dashboard shows: active, unassigned, overdue, assigned to me,
  resolved today, and a breakdown by status and priority. Each KPI links to the matching filtered queue.
- **US-9** As an agent, I can filter the queue by status (including "Active"), priority,
  category, assignee (me / unassigned / anyone) and overdue. I can search by title,
  description or `#number`, sort by newest, oldest, priority or due date, and page through results.
  - Filters are kept in the URL, so they can be shared and the back button works.
- **US-10** As an agent, I can claim an unassigned ticket. An `OPEN` ticket moves to `IN_PROGRESS` when claimed.
- **US-11** As an agent, I can change status, but only along allowed transitions (see §8). Invalid moves are rejected.
- **US-12** As an agent, I can change priority, and the SLA due date is recalculated from creation time.
- **US-13** As an agent, I can post a public reply or an **internal note**. Customers never receive internal notes from the API.
- **US-14** As an admin, I can assign a ticket to any agent. Agents can only assign tickets to themselves or unassign them.
- **US-15** As any viewer of a ticket, I see an activity timeline of creation, status, priority and assignment changes, with who made each change and when.

## 7. Functional requirements

| ID | Requirement |
|---|---|
| FR-1 | JWT bearer authentication. Passwords hashed with bcrypt. `GET /auth/me` restores the session. |
| FR-2 | Role checks enforced **on the API** (UI guards are only for convenience). |
| FR-3 | Ticket fields: number, title, description, category, priority, status, requester, assignee, dueAt, resolvedAt, timestamps. |
| FR-4 | Categories: `BILLING`, `TECHNICAL`, `ACCOUNT`, `OTHER`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. |
| FR-5 | SLA windows: URGENT 4h, HIGH 24h, MEDIUM 48h, LOW 72h. Overdue = active status and `now > dueAt`. |
| FR-6 | Server-side pagination (max 50 per page) with `{ data, meta: { page, pageSize, total, totalPages } }`. |
| FR-7 | Ticket changes and their activity events are written in a single DB transaction. |
| FR-8 | Customers get a 404 (not a 403) for tickets that aren't theirs, so they can't probe for ticket ids. |
| FR-9 | Errors use one format: `{ error: { code, message, details? } }`. Validation errors include per-field messages. |
| FR-10 | Seeded demo data: 1 admin, 2 agents, 2 customers, about 14 tickets across all statuses and priorities, some overdue. |

## 8. Ticket lifecycle

```
OPEN ──► IN_PROGRESS ──► PENDING ──► RESOLVED ──► CLOSED
  │          ▲   │          │           │
  │          │   └──────────┼──► RESOLVED/CLOSED
  │          └── customer reply (auto) ─┘
  └──► PENDING / RESOLVED / CLOSED
```

| From | Allowed to |
|---|---|
| OPEN | IN_PROGRESS, PENDING, RESOLVED, CLOSED |
| IN_PROGRESS | OPEN, PENDING, RESOLVED, CLOSED |
| PENDING | IN_PROGRESS, RESOLVED, CLOSED |
| RESOLVED | IN_PROGRESS (re-open), CLOSED |
| CLOSED | none (terminal) |

## 9. API (MVP)

Base path `/api`. Every route except auth and health needs `Authorization: Bearer <token>`.

| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/health` | Public | Liveness check |
| POST | `/auth/register` | Public | Create a customer account and return `{ token, user }` |
| POST | `/auth/login` | Public | Return `{ token, user }` |
| GET | `/auth/me` | Any | Current user |
| GET | `/tickets` | Any (customers scoped to own) | List, with `status, priority, category, assignee, overdue, q, sort, page, pageSize` |
| POST | `/tickets` | Any | Create a ticket |
| GET | `/tickets/:id` | Owner / staff | Detail with comments, events and `allowedTransitions` |
| PATCH | `/tickets/:id` | Staff (customer: close only) | Update `status`, `priority`, `assigneeId` |
| POST | `/tickets/:id/assign` | Staff | Claim the ticket for yourself |
| POST | `/tickets/:id/comments` | Owner / staff | Add a reply (`isInternal` is staff only) |
| GET | `/users?role=STAFF` | Staff | Assignee picker options |
| GET | `/stats/summary` | Staff | Dashboard KPIs |

## 10. Data model

```
User (id, name, email*, passwordHash, role, createdAt, updatedAt)
 ├─< Ticket.requester
 ├─< Ticket.assignee (optional)
 ├─< Comment.author
 └─< TicketEvent.actor

Ticket (id, number*, title, description, category, priority, priorityRank,
        status, dueAt, resolvedAt, requesterId, assigneeId, createdAt, updatedAt)
 ├─< Comment (id, body, isInternal, authorId, createdAt)
 └─< TicketEvent (id, type, fromValue, toValue, actorId, createdAt)
```
`*` = unique. Enum-like values are stored as strings (SQLite has no enums) and
validated against one shared constants module.

## 11. Non-functional requirements

| Area | Requirement |
|---|---|
| Runs out of the box | `npm install` creates `.env`, migrates and seeds the DB. `npm run dev` starts the API (:4000) and the client (:5173). Works on Windows, macOS and Linux. |
| Code quality | TypeScript strict mode, ESLint + Prettier, layered backend (routes → controller → service → domain), feature-based frontend. |
| Reusability | Shared UI kit (Button, Input, Select, Badge, Card, DataTable, Pagination, EmptyState, Spinner, Modal), with domain components built on top. |
| State management | TanStack Query for server state (caching, invalidation, optimistic updates). Zustand for the auth session. URL search params for filters. |
| Routing | React Router data router, lazy-loaded pages, protected and role-based route guards, 404 route. |
| Testing | Backend: unit tests (domain rules, schemas) and integration tests (supertest on a disposable SQLite DB). Frontend: Vitest + React Testing Library + MSW. `npm test` runs everything. |
| Security | bcrypt hashing, JWT expiry, helmet, CORS allow-list, input validation on every endpoint, no password hashes in responses. |
| UX | Loading, empty and error states on every screen. Toasts for API errors. Responsive layout. |

## 12. Exam requirement mapping

| Exam requirement | How QueueDesk meets it |
|---|---|
| Login page | `/login` (+ `/register`) |
| 2 workflows or 4 screens (excluding login) | 2 workflows (customer, agent) and 5 screens |
| Runs out of the box | `postinstall` setup script, SQLite, env defaults |
| Git | Repository with small conventional commits |
| README.md | Setup, scripts, demo accounts, architecture, API |
| Connects to an API | Custom Express REST API |
| Proper routing | React Router guards + modular Express routers |
| Code structure | Monorepo with `client/` and `server/`, layered by feature |
| Unit tests | Vitest on both sides |
| Reusability + state management | UI kit, TanStack Query, Zustand |

## 13. Success metrics (MVP demo)

- Fresh clone to running app with **2 commands** and no manual steps.
- Both workflows can be completed end to end with the seeded accounts.
- All tests pass, and lint and typecheck are clean.
- Zero data leaks in tests: customers can't read others' tickets or internal notes.

## 14. Milestones

| Day | Deliverables |
|---|---|
| 1 | Repo scaffold, Prisma schema + seed, auth, tickets/comments/stats API, domain rules, backend tests, PRD + flow charts |
| 2 | Client scaffold, UI kit, auth + route guards, queue/list, create, detail (comments, timeline, actions), dashboard |
| 3 | Frontend tests, polish (empty/error/loading, responsive), README, fresh-clone verification |

## 15. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Reviewer can't run the app (automatic fail) | SQLite (no DB server), `.env` created automatically, idempotent seed, cross-platform npm scripts, fresh-clone test before submitting |
| Time pressure | Scope locked to this MVP. Post-MVP list kept separate. |
| Concurrent ticket numbering | Numbers assigned inside a DB transaction. SQLite serializes writes. |
| Leaking internal notes | Filtered in the server mapper by viewer role and covered by integration tests |

## 16. Post-MVP roadmap

1. Email notifications on reply and status change
2. File attachments
3. Real-time queue updates (SSE/websockets)
4. Canned responses and macros
5. SLA business hours and escalation rules
6. CSAT rating after resolution
7. Postgres + Docker Compose for production deployment
