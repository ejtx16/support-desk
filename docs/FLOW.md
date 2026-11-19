# QueueDesk — How the Ticket Support Queue Works

These diagrams describe the behaviour enforced by the API
(`server/src/domain/ticketRules.ts` and `server/src/modules/tickets/tickets.service.ts`).

## Quick overview (for business and QA)

The whole app on one page in plain language. Step numbers match the QA checklist below.
Dashed boxes are **planned** screens. They are not in the PRD or the code yet.

```mermaid
flowchart TD
    Start(["1. Open QueueDesk"]) --> SignIn["2. Sign in or create an account"]
    SignIn --> Who{"Who is signing in?"}

    subgraph Customer["Customer"]
        MyTickets["3. My Tickets: see my requests"]
        Raise["4. Raise a new ticket"]
        Follow["5. Open my ticket: read replies, answer back"]
        Close["6. Close ticket when the problem is fixed"]
    end

    subgraph Team["Support agent / Admin"]
        Dash["7. Dashboard: what needs attention now"]
        List["8a. Ticket list: search and filter"]
        Board["8b. Ticket board: columns by status"]
        Work["9. Open ticket and take ownership"]
        Respond["10. Reply to customer or add a private note"]
        Move["11. Move ticket: Waiting on customer or Solved"]
    end

    subgraph Everyone["Menu for every user"]
        Account["12. My Account: name, email, password"]
        Settings["13. Settings: preferences"]
        Logout["14. Sign out"]
    end

    Who -- Customer --> MyTickets
    Who -- Agent or Admin --> Dash
    Who --> Account & Settings & Logout

    MyTickets --> Raise --> Queue[("Shared support queue")]
    MyTickets --> Follow --> Close --> Done(["Ticket closed"])

    Queue --> List & Board
    Dash --> List & Board
    List & Board --> Work --> Respond --> Move
    Move -- Customer sees the update --> Follow
    Follow -- Customer replies --> Work

    classDef planned stroke-dasharray: 5 5
    class Board,Account,Settings planned
```

### QA checklist for the overview

| Step | What to check                                    | Expected result                                                                    |
| ---- | ------------------------------------------------ | ---------------------------------------------------------------------------------- |
| 2    | Sign in with a wrong password                    | "Invalid email or password". It does not say which one was wrong.                  |
| 2    | Customer signs in                                | Lands on My Tickets. Opening `/dashboard` sends them back to `/tickets`.           |
| 2    | Agent or Admin signs in                          | Lands on the Dashboard.                                                            |
| 3    | Customer views their list                        | Only their own tickets are shown.                                                  |
| 4    | Submit a ticket with missing fields              | Inline errors. Nothing is saved.                                                   |
| 4    | Submit a valid ticket                            | Status is Open, number is `#1001` or higher, due date is set by priority.          |
| 5    | Customer replies to a Waiting or Solved ticket   | Ticket goes back to In Progress.                                                   |
| 6    | Customer closes a ticket                         | Ticket becomes read-only. No more replies or edits.                                |
| 7    | Click a dashboard number                         | Opens the ticket list with the matching filter applied.                            |
| 8a   | Filter, search, sort, page, then press Back      | Filters are kept in the URL. Back restores the previous view.                      |
| 8b   | _(planned)_ Drag a card to another column        | Only allowed status moves work. Invalid moves are rejected. Same rules as step 11. |
| 9    | Claim an unassigned Open ticket                  | Agent becomes owner. Status becomes In Progress.                                   |
| 10   | Add a private note                               | Customer never sees it.                                                            |
| 11   | Change priority                                  | Due date is recalculated from when the ticket was created.                         |
| 11   | Try a move that is not allowed (see diagram 2)   | Rejected with an error. Ticket does not change.                                    |
| 12   | _(planned)_ Update name, email or password       | Changes are saved. A duplicate email is rejected. Password rules match sign-up.    |
| 13   | _(planned)_ Change a setting and reload the page | Setting is still applied.                                                          |
| 14   | Sign out, then reload                            | User is back on the sign-in page.                                                  |

## 1. End-to-end flow

```mermaid
flowchart TD
    Start([User opens QueueDesk]) --> Auth{Has valid session?}
    Auth -- No --> Login[Login / Register page]
    Login --> Creds{Credentials valid?}
    Creds -- No --> LoginErr[Show 'Invalid email or password'] --> Login
    Creds -- Yes --> Role{User role}
    Auth -- Yes --> Role

    %% Customer workflow
    Role -- CUSTOMER --> MyTickets[My Tickets list]
    MyTickets --> NewTicket[Create Ticket form:<br/>title, description, category, priority]
    NewTicket --> Validate{Valid input?}
    Validate -- No --> FormErr[Inline validation errors] --> NewTicket
    Validate -- Yes --> Created[Ticket created<br/>status = OPEN<br/>dueAt = now + SLA hours]
    Created --> Queue[(Shared support queue)]
    MyTickets --> CustDetail[Ticket detail:<br/>public replies + timeline]
    CustDetail --> CustReply[Customer replies]
    CustReply --> Reopen{Status is PENDING<br/>or RESOLVED?}
    Reopen -- Yes --> BackToProgress[Auto move to IN_PROGRESS] --> Queue
    Reopen -- No --> Queue
    CustDetail --> CustClose[Customer closes ticket] --> Closed([CLOSED])

    %% Agent workflow
    Role -- AGENT / ADMIN --> Dashboard[Dashboard KPIs:<br/>active, unassigned, overdue, mine]
    Dashboard --> QueueView[Queue view:<br/>filter, search, sort, paginate]
    Queue --> QueueView
    QueueView --> AgentDetail[Ticket detail]
    AgentDetail --> Claimed{Assigned?}
    Claimed -- No --> Claim[Claim ticket<br/>OPEN becomes IN_PROGRESS]
    Claim --> Work
    Claimed -- Yes --> Work[Work the ticket]
    Work --> Reply[Public reply<br/>visible to customer]
    Work --> Note[Internal note<br/>staff only]
    Work --> Priority[Change priority<br/>SLA dueAt recalculated]
    Work --> Status[Change status]
    Status --> Pending[PENDING<br/>waiting on customer] --> CustDetail
    Status --> Resolved[RESOLVED] --> CustDetail
    Status --> Closed
    Reply --> CustDetail
```

## 2. Ticket status state machine

```mermaid
stateDiagram-v2
    [*] --> OPEN: Customer submits ticket
    OPEN --> IN_PROGRESS: Agent claims / starts work
    OPEN --> PENDING: Agent needs info
    OPEN --> RESOLVED
    OPEN --> CLOSED

    IN_PROGRESS --> OPEN: Agent un-assigns / returns to queue
    IN_PROGRESS --> PENDING: Waiting on customer
    IN_PROGRESS --> RESOLVED: Fix delivered
    IN_PROGRESS --> CLOSED

    PENDING --> IN_PROGRESS: Customer replies (automatic)
    PENDING --> RESOLVED
    PENDING --> CLOSED

    RESOLVED --> IN_PROGRESS: Re-opened / customer replies (automatic)
    RESOLVED --> CLOSED: Confirmed done

    CLOSED --> [*]: Terminal - no edits or comments
```

## 3. Who can do what

```mermaid
flowchart LR
    subgraph Customer
        C1[Create ticket]
        C2[View OWN tickets only]
        C3[Public reply]
        C4[Close own ticket]
    end
    subgraph Agent
        A1[View all tickets]
        A2[Claim ticket for self]
        A3[Change status / priority]
        A4[Public reply + internal note]
        A5[Dashboard stats]
    end
    subgraph Admin
        D1[Everything an agent can do]
        D2[Assign ticket to ANY agent]
    end
```

## 4. SLA and overdue rules

```mermaid
flowchart TD
    P{Priority} -- URGENT --> H4[Due in 4h]
    P -- HIGH --> H24[Due in 24h]
    P -- MEDIUM --> H48[Due in 48h]
    P -- LOW --> H72[Due in 72h]
    H4 & H24 & H48 & H72 --> Check{Status is OPEN,<br/>IN_PROGRESS or PENDING<br/>AND now > dueAt?}
    Check -- Yes --> Overdue[Flagged OVERDUE<br/>in queue + dashboard]
    Check -- No --> OnTrack[On track]
```

SLA is always measured from the ticket's creation time, so changing priority
recalculates `dueAt` from `createdAt`, not from the moment of the change.

## 5. Request lifecycle (client to API)

```mermaid
sequenceDiagram
    actor U as User
    participant UI as React client
    participant API as Express API
    participant DB as SQLite (Prisma)

    U->>UI: Submit login form
    UI->>API: POST /api/auth/login
    API->>DB: Find user, verify bcrypt hash
    API-->>UI: { token, user }
    UI->>UI: Store session (Zustand)

    U->>UI: Open ticket queue
    UI->>API: GET /api/tickets?status=ACTIVE&sort=priority (Bearer token)
    API->>API: authenticate + validate query
    API->>DB: Scoped query (customers see own tickets only)
    API-->>UI: { data, meta } (cached by TanStack Query)

    U->>UI: Change status to RESOLVED
    UI->>API: PATCH /api/tickets/:id
    API->>API: Check role permissions + allowed transition
    API->>DB: Transaction: update ticket + write TicketEvent
    API-->>UI: Updated ticket detail
    UI->>UI: Invalidate ticket list + stats queries
```
