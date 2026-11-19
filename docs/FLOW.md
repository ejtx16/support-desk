# QueueDesk — How the Ticket Support Queue Works

These diagrams describe the behaviour enforced by the API
(`server/src/domain/ticketRules.ts` and `server/src/modules/tickets/tickets.service.ts`).

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
