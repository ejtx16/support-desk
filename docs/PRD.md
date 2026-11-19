# QueueDesk — Product Requirements Document

|             |                                                                                                |
| ----------- | ---------------------------------------------------------------------------------------------- |
| **Product** | QueueDesk: ticket support queue                                                                |
| **Version** | MVP 1.1 (core queue + notifications bell + profile)                                            |
| **Status**  | Implemented. Every requirement below is built and covered by tests.                            |
| **Stack**   | React + Vite (TypeScript) client · Node.js / Express (TypeScript) REST API · SQLite via Prisma |
| **Related** | [App flow](./flow.md) · [README](../README.md)                                                 |

---

## 1. Problem

Small support teams take requests through email, chat and DMs. Tickets get lost, nobody knows who
owns a request, urgent issues sit next to trivial ones, and there is no record of what happened.
Customers can't see the status of their request, so they follow up again and add more noise.

## 2. Solution

QueueDesk is one shared queue for support requests:

- **Customers** submit a ticket, track its status and talk with the support team in one thread.
- **Agents** work a prioritized queue: they claim tickets, set status and priority, reply publicly
  or leave internal notes, and resolve.
- Every ticket gets an **SLA due date** based on its priority, and overdue work is flagged.
- Every change is written to an **activity timeline**, so nothing happens without a record.
- A **notification bell** tells each person when something they care about changes, so nobody has
  to keep refreshing the queue.

## 3. Goals and non-goals

### Goals

1. A customer can go from login to a submitted ticket in under a minute.
2. An agent can find the most urgent unowned work in one click from the dashboard.
3. Access rules hold: customers only see their own tickets and never see internal notes.
4. People learn about replies, assignments and status changes without refreshing.
5. The app runs on a fresh clone with `npm install` then `npm run dev`. No manual DB setup.

### Non-goals (post-MVP)

Email or Slack delivery of notifications, real-time push (websockets/SSE), editing the profile or
password, file attachments, multi-tenant workspaces, SLA business-hours calendars, canned
responses, CSAT surveys, knowledge base.

## 4. Users and roles

| Role       | Who                    | Key needs                                                          |
| ---------- | ---------------------- | ------------------------------------------------------------------ |
| `CUSTOMER` | Person asking for help | Submit requests, see status, reply, close when done                |
| `AGENT`    | Support staff          | See the whole queue, prioritize, own tickets, communicate, resolve |
| `ADMIN`    | Team lead              | Everything an agent can do, plus assign tickets to any agent       |

## 5. Scope: workflows and screens

The app ships **2 workflows** and **6 screens** besides login. Login doesn't count towards the
exam's "2 workflows / 4 screens".

**Workflow A: customer request.**
Login / Register → My Tickets → New Ticket → Ticket Detail (reply / close)

**Workflow B: agent triage.**
Login → Dashboard → Queue (search / filter / sort) → Ticket Detail → Claim → Change status or
priority → Reply or internal note → Resolve

| #   | Screen                    | Route                | Roles               | Purpose                                                 |
| --- | ------------------------- | -------------------- | ------------------- | ------------------------------------------------------- |
| 0   | Login                     | `/login`             | Public              | Sign in. Demo-account buttons fill in the form.         |
| 0b  | Register                  | `/register`          | Public              | Self-service customer signup                            |
| 1   | Dashboard                 | `/dashboard`         | Agent, Admin        | Queue health KPIs, breakdowns, "Needs an owner" list    |
| 2   | Ticket Queue / My Tickets | `/tickets`           | All (scoped)        | Searchable, filterable, sortable, paginated ticket list |
| 3   | New Ticket                | `/tickets/new`       | All                 | Submit a new request                                    |
| 4   | Ticket Detail             | `/tickets/:ticketId` | Owner, Agent, Admin | Conversation, activity, actions                         |
| 5   | Profile                   | `/profile`           | All                 | Account details and what the user's role can do         |
| 6   | Not Found                 | `*`                  | All                 | Friendly 404                                            |

The header on every signed-in screen holds the main navigation, the **notification bell**, a link to
the **profile** (avatar and name) and **Sign out**. [FLOW.md](./flow.md) shows all of it in one
diagram.

## 6. User stories and acceptance criteria

### Authentication

- **US-1** As a user, I can log in with email and password.
  - Wrong credentials show "Invalid email or password". The message doesn't say which one was wrong.
  - After login I go to `/dashboard` (staff) or `/tickets` (customer).
  - My session survives a page reload and is re-checked against the API on load. Logging out clears
    it, along with any cached data.
- **US-2** As a new customer, I can register with name, email and password.
  - Password needs at least 8 characters with a letter and a number. Duplicate emails are rejected.
- **US-3** As a user, I can't open pages my role doesn't allow.
  - Signed-out users are sent to `/login` and returned to the page they asked for after logging in.
  - A customer opening `/dashboard` is redirected to `/tickets`.
  - Signed-in users opening `/login` or `/register` are sent to their home page.

### Customer workflow

- **US-4** As a customer, I can create a ticket with title, description, category and priority.
  - Validation errors show inline. The form shows the SLA response target for the chosen priority.
  - On success I land on the new ticket's detail page.
  - The ticket starts `OPEN` with number `#1001+` and a due date set by priority.
- **US-5** As a customer, I see only my own tickets, with status, priority and last update.
- **US-6** As a customer, I can reply on my ticket.
  - If the ticket is `PENDING` or `RESOLVED`, my reply moves it back to `IN_PROGRESS`.
- **US-7** As a customer, I can close my own ticket after confirming. A closed ticket is read-only:
  no replies and no changes.

### Agent workflow

- **US-8** As an agent, the dashboard shows active, unassigned, overdue, assigned to me and resolved
  today, plus breakdowns by status and by priority, and a "Needs an owner" list of the
  highest-priority unassigned tickets. Each KPI and bar links to the matching filtered queue.
- **US-9** As an agent, I can filter the queue by status (including "Active"), priority, category,
  assignee (me / unassigned / anyone) and overdue. I can search by title, description or
  `#number`, sort by newest, oldest, priority or due date, and page through results.
  - Filters are kept in the URL, so they can be shared and the back button works.
- **US-10** As an agent, I can claim an unassigned ticket, or take over one owned by someone else.
  An `OPEN` ticket moves to `IN_PROGRESS` when claimed.
- **US-11** As an agent, I can change status, but only along allowed transitions (§8). The status
  picker only offers allowed moves, and the API rejects anything else.
- **US-12** As an agent, I can change priority, and the SLA due date is recalculated from creation
  time.
- **US-13** As an agent, I can post a public reply or an **internal note**. Customers never receive
  internal notes from the API.
- **US-14** As an admin, I can assign a ticket to any agent. Agents can only assign tickets to
  themselves.
- **US-15** As any viewer of a ticket, I see one activity thread that mixes replies with status,
  priority and assignment changes, in time order, showing who did what and when.

### Notifications

- **US-16** As any user, I see a bell in the header with my unread count, so I know when something
  needs my attention.
- **US-17** As any user, I can open the bell, switch between All and Unread, click a notification to
  go to its ticket (which marks it read), or mark everything as read.
- **US-18** As an agent, I'm told when a customer opens a ticket, when a ticket is assigned to me,
  and when someone replies on or changes a ticket I own.
- **US-19** As a customer, I'm told when an agent picks up my ticket, replies, or changes its
  status. I'm never told about internal notes.

### Profile

- **US-20** As any user, I can open my profile from the avatar in the header.
  - It shows my name, email, role and the date I joined, plus a plain-language list of what my
    role can do.
  - I can sign out from it. The profile is read-only in this version.

## 7. Functional requirements

| ID    | Requirement                                                                                                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------- |
| FR-1  | JWT bearer authentication. Passwords hashed with bcrypt. `GET /auth/me` restores the session.                              |
| FR-2  | Role checks enforced **on the API**. UI guards are only for convenience.                                                   |
| FR-3  | Ticket fields: number, title, description, category, priority, status, requester, assignee, dueAt, resolvedAt, timestamps. |
| FR-4  | Categories: `BILLING`, `TECHNICAL`, `ACCOUNT`, `OTHER`. Priorities: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.                     |
| FR-5  | SLA windows: URGENT 4h, HIGH 24h, MEDIUM 48h, LOW 72h. Overdue = active status and `now > dueAt`.                          |
| FR-6  | Server-side pagination (max 50 per page) with `{ data, meta: { page, pageSize, total, totalPages } }`.                     |
| FR-7  | A ticket change, its activity event and its notifications are written in one DB transaction.                               |
| FR-8  | Customers get a 404 (not a 403) for tickets that aren't theirs, so they can't probe for ticket ids.                        |
| FR-9  | Errors use one format: `{ error: { code, message, details? } }`. Validation errors include per-field messages.             |
| FR-10 | Notifications follow the recipient rules in §9. Users can only read and update their own.                                  |
| FR-11 | Seeded demo data: 1 admin, 2 agents, 2 customers, about 14 tickets across all statuses and priorities, some overdue.       |

## 8. Ticket lifecycle

| From        | Allowed to                             |
| ----------- | -------------------------------------- |
| OPEN        | IN_PROGRESS, PENDING, RESOLVED, CLOSED |
| IN_PROGRESS | OPEN, PENDING, RESOLVED, CLOSED        |
| PENDING     | IN_PROGRESS, RESOLVED, CLOSED          |
| RESOLVED    | IN_PROGRESS (re-open), CLOSED          |
| CLOSED      | none (terminal)                        |

- Claiming an `OPEN` ticket moves it to `IN_PROGRESS`.
- A customer reply on a `PENDING` or `RESOLVED` ticket moves it back to `IN_PROGRESS`.
- Moving to `RESOLVED` or `CLOSED` sets `resolvedAt`. Re-opening clears it.
- Any other move returns `422`.

## 9. Notification rules

| Event            | Recipients                      |
| ---------------- | ------------------------------- |
| Ticket created   | All agents and admins           |
| Ticket assigned  | New assignee, and the requester |
| Status changed   | Requester and assignee          |
| Priority changed | Assignee                        |
| Public reply     | Requester and assignee          |
| Internal note    | Assignee only                   |

- The person who made the change is never notified, and nobody gets the same notification twice.
- A rejected change creates no notifications (same transaction, FR-7).
- Another user's notification id returns `404`.
- **Delivery:** the client polls every 20 seconds and whenever the tab regains focus. When the
  unread count goes up, the queue and dashboard refresh too. Real-time push stays on the roadmap.

## 10. API

Base path `/api`. Every route except auth and health needs `Authorization: Bearer <token>`.

| Method | Path                      | Access                        | Description                                                                         |
| ------ | ------------------------- | ----------------------------- | ----------------------------------------------------------------------------------- |
| GET    | `/health`                 | Public                        | Liveness check                                                                      |
| POST   | `/auth/register`          | Public                        | Create a customer account and return `{ token, user }`                              |
| POST   | `/auth/login`             | Public                        | Return `{ token, user }`                                                            |
| GET    | `/auth/me`                | Any                           | Current user (also feeds the profile page)                                          |
| GET    | `/tickets`                | Any (customers scoped to own) | List, with `status, priority, category, assignee, overdue, q, sort, page, pageSize` |
| POST   | `/tickets`                | Any                           | Create a ticket                                                                     |
| GET    | `/tickets/:id`            | Owner / staff                 | Detail with comments, events and `allowedTransitions`                               |
| PATCH  | `/tickets/:id`            | Staff (customer: close only)  | Update `status`, `priority`, `assigneeId`                                           |
| POST   | `/tickets/:id/assign`     | Staff                         | Claim the ticket for yourself                                                       |
| POST   | `/tickets/:id/comments`   | Owner / staff                 | Add a reply (`isInternal` is staff only)                                            |
| GET    | `/users?role=STAFF`       | Staff                         | Assignee picker options                                                             |
| GET    | `/stats/summary`          | Staff                         | Dashboard KPIs                                                                      |
| GET    | `/notifications`          | Any (own only)                | Bell inbox with `unreadCount`. Optional `unread=true`, `limit` (max 50)             |
| PATCH  | `/notifications/:id/read` | Own only                      | Mark one notification read                                                          |
| POST   | `/notifications/read-all` | Any                           | Mark all of the caller's notifications read                                         |

## 11. Data model

```
User (id, name, email*, passwordHash, role, createdAt, updatedAt)
 ├─< Ticket.requester
 ├─< Ticket.assignee (optional)
 ├─< Comment.author
 ├─< TicketEvent.actor
 └─< Notification.user

Ticket (id, number*, title, description, category, priority, priorityRank,
        status, dueAt, resolvedAt, requesterId, assigneeId, createdAt, updatedAt)
 ├─< Comment (id, body, isInternal, authorId, createdAt)
 ├─< TicketEvent (id, type, fromValue, toValue, actorId, createdAt)
 └─< Notification (id, userId, type, message, readAt?, createdAt)
```

`*` = unique. Enum-like values (role, status, priority, category, event and notification types)
are stored as strings, since SQLite has no enums, and validated against one shared constants
module. Notifications are indexed on `(userId, readAt)` and `(userId, createdAt)`.

## 12. Non-functional requirements

| Area                | Requirement                                                                                                                                                                      |
| ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Runs out of the box | `npm install` creates `.env`, migrates and seeds the DB. `npm run dev` starts the API (:4000) and the client (:5173). Works on Windows, macOS and Linux.                         |
| Code quality        | TypeScript strict mode, ESLint + Prettier, layered backend (routes → controller → service → domain), component-based frontend grouped by feature.                                |
| Reusability         | Shared UI kit (Button, Input, Textarea, Select, FormField, Badge, Card, DataTable, Pagination, EmptyState, Spinner, Avatar, ConfirmDialog), with feature components built on it. |
| State management    | TanStack Query for server state (caching, invalidation, optimistic status/priority updates). Zustand for the auth session. URL search params for queue filters.                  |
| Routing             | React Router data router, lazy-loaded pages, protected and role-based route guards, 404 route.                                                                                   |
| Testing             | Backend: unit tests (domain rules, schemas) and integration tests (supertest on a disposable SQLite DB). Frontend: Vitest + React Testing Library + MSW. `npm test` runs both.   |
| Security            | bcrypt hashing, JWT expiry, helmet, CORS allow-list, input validation on every endpoint, no password hashes in responses.                                                        |
| UX                  | Loading, empty and error states on every screen. Toasts for success and API errors. Responsive layout.                                                                           |

## 13. Exam requirement mapping

| Exam requirement                           | How QueueDesk meets it                                      |
| ------------------------------------------ | ----------------------------------------------------------- |
| Login page                                 | `/login` (+ `/register`)                                    |
| 2 workflows or 4 screens (excluding login) | 2 workflows (customer, agent) and 6 screens                 |
| Runs out of the box                        | `postinstall` setup script, SQLite, env defaults            |
| Git                                        | Repository with small conventional commits                  |
| README.md                                  | Short run guide, demo accounts, commands, structure         |
| Connects to an API                         | Custom Express REST API                                     |
| Proper routing                             | React Router guards + modular Express routers               |
| Code structure                             | Monorepo with `client/` and `server/`, organised by feature |
| Unit tests                                 | Vitest on both sides                                        |
| Reusability + state management             | Component-based UI kit, TanStack Query, Zustand             |

## 14. Success metrics

- Fresh clone to running app with **2 commands** and no manual steps.
- Both workflows can be completed end to end with the seeded accounts.
- A reply or assignment shows up in the other person's bell within 20 seconds.
- All tests pass, and lint and typecheck are clean.
- Zero data leaks in tests: customers can't read others' tickets, internal notes, or other users'
  notifications.

## 15. Milestones

| Day | Deliverables                                                                                                         |
| --- | -------------------------------------------------------------------------------------------------------------------- |
| 1   | Repo scaffold, Prisma schema + seed, auth, tickets/comments/stats API, domain rules, backend tests, PRD + flow       |
| 2   | Client scaffold, UI kit, auth + route guards, queue, new ticket, ticket detail (thread, actions), dashboard          |
| 3   | Notifications (API + bell), profile page, frontend tests, polish (empty/error/loading, responsive), README, clean-up |

## 16. Risks and mitigations

| Risk                                        | Mitigation                                                                                                                           |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Reviewer can't run the app (automatic fail) | SQLite (no DB server), `.env` created automatically, idempotent seed, cross-platform npm scripts, fresh-clone test before submitting |
| Time pressure                               | Scope locked to this document. Post-MVP list kept separate.                                                                          |
| Concurrent ticket numbering                 | Numbers assigned inside a DB transaction. SQLite serializes writes.                                                                  |
| Leaking internal notes                      | Filtered in the server mapper by viewer role, never sent to customers as notifications, covered by integration tests                 |
| Polling load from the bell                  | 20-second interval, small capped payload (max 50), indexed queries                                                                   |

## 17. Post-MVP roadmap

1. Email copies of in-app notifications (reply and status change)
2. Real-time updates (SSE/websockets) instead of polling
3. Editable profile: name, email and password change
4. File attachments
5. Canned responses and macros
6. SLA business hours and escalation rules
7. CSAT rating after resolution
8. Postgres + Docker Compose for production deployment
