/**
 * Idempotent seed: demo users are upserted, sample tickets are only created
 * when the ticket table is empty. Safe to run on every `npm install`.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import {
  PRIORITY_WEIGHT,
  type Role,
  type TicketCategory,
  type TicketPriority,
  type TicketStatus,
} from '../src/domain/constants';
import { calculateDueAt } from '../src/domain/ticketRules';

const prisma = new PrismaClient();

export const DEMO_PASSWORD = 'Password123!';

const USERS: { key: string; name: string; email: string; role: Role }[] = [
  { key: 'admin', name: 'Ada Admin', email: 'admin@queuedesk.test', role: 'ADMIN' },
  { key: 'agent', name: 'Alex Agent', email: 'agent@queuedesk.test', role: 'AGENT' },
  { key: 'agent2', name: 'Sam Support', email: 'sam@queuedesk.test', role: 'AGENT' },
  { key: 'customer', name: 'Casey Customer', email: 'customer@queuedesk.test', role: 'CUSTOMER' },
  { key: 'customer2', name: 'Jordan Lee', email: 'jordan@queuedesk.test', role: 'CUSTOMER' },
];

interface SeedTicket {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  requester: string;
  assignee?: string;
  hoursAgo: number;
  comments?: { author: string; body: string; isInternal?: boolean }[];
}

const TICKETS: SeedTicket[] = [
  {
    title: 'Cannot log in after password reset',
    description: 'I reset my password this morning but the new one is rejected on the login page.',
    category: 'ACCOUNT',
    priority: 'HIGH',
    status: 'OPEN',
    requester: 'customer',
    hoursAgo: 30,
  },
  {
    title: 'Charged twice for the November invoice',
    description: 'My card statement shows two identical charges for invoice INV-2041.',
    category: 'BILLING',
    priority: 'URGENT',
    status: 'IN_PROGRESS',
    requester: 'customer',
    assignee: 'agent',
    hoursAgo: 6,
    comments: [
      { author: 'agent', body: 'Thanks for reporting this. I am checking with our payment provider now.' },
      { author: 'agent', body: 'Looks like a gateway retry. Refund #2 pending approval.', isInternal: true },
    ],
  },
  {
    title: 'Export to CSV times out on large reports',
    description: 'Exporting the yearly report (about 40k rows) spins for minutes then fails with a 504.',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    status: 'PENDING',
    requester: 'customer2',
    assignee: 'agent2',
    hoursAgo: 52,
    comments: [
      { author: 'agent2', body: 'Could you tell us which browser and the approximate report date range?' },
    ],
  },
  {
    title: 'How do I add a teammate to my workspace?',
    description: 'I would like to invite a colleague but cannot find the invite button anywhere.',
    category: 'OTHER',
    priority: 'LOW',
    status: 'RESOLVED',
    requester: 'customer2',
    assignee: 'agent',
    hoursAgo: 80,
    comments: [
      { author: 'agent', body: 'Go to Settings -> Members -> Invite. Only workspace owners can see it.' },
      { author: 'customer2', body: 'Found it, thank you!' },
    ],
  },
  {
    title: 'Dark mode makes table headers unreadable',
    description: 'With dark mode enabled the column headers on the dashboard are black on dark grey.',
    category: 'TECHNICAL',
    priority: 'LOW',
    status: 'OPEN',
    requester: 'customer',
    hoursAgo: 2,
  },
  {
    title: 'Update billing address for tax receipt',
    description: 'Our company moved offices. Please update the billing address used on receipts.',
    category: 'BILLING',
    priority: 'MEDIUM',
    status: 'CLOSED',
    requester: 'customer',
    assignee: 'agent2',
    hoursAgo: 200,
    comments: [{ author: 'agent2', body: 'Address updated. Future receipts will use the new one.' }],
  },
  {
    title: 'API returns 500 when filtering by date',
    description: 'GET /v1/orders?from=2026-01-01 consistently returns 500 since yesterday.',
    category: 'TECHNICAL',
    priority: 'URGENT',
    status: 'OPEN',
    requester: 'customer2',
    hoursAgo: 9,
  },
  {
    title: 'Two-factor codes arrive late',
    description: 'SMS codes for 2FA take 3-5 minutes to arrive and often expire before I can use them.',
    category: 'ACCOUNT',
    priority: 'HIGH',
    status: 'IN_PROGRESS',
    requester: 'customer2',
    assignee: 'agent2',
    hoursAgo: 20,
  },
  {
    title: 'Request: monthly invoices instead of annual',
    description: 'Is it possible to switch our plan to monthly billing starting next cycle?',
    category: 'BILLING',
    priority: 'LOW',
    status: 'OPEN',
    requester: 'customer',
    hoursAgo: 100,
  },
  {
    title: 'Notifications email going to spam',
    description: 'All notification emails land in our spam folder. Is there an SPF/DKIM record we need?',
    category: 'TECHNICAL',
    priority: 'MEDIUM',
    status: 'OPEN',
    requester: 'customer',
    hoursAgo: 12,
  },
  {
    title: 'Delete my old account',
    description: 'I have a duplicate account under my personal email that I would like removed.',
    category: 'ACCOUNT',
    priority: 'LOW',
    status: 'PENDING',
    requester: 'customer2',
    assignee: 'agent',
    hoursAgo: 60,
    comments: [
      { author: 'agent', body: 'Please confirm the email address of the account you want deleted.' },
    ],
  },
  {
    title: 'Mobile app crashes on startup (Android 15)',
    description: 'After the latest update the Android app closes immediately after the splash screen.',
    category: 'TECHNICAL',
    priority: 'HIGH',
    status: 'OPEN',
    requester: 'customer',
    hoursAgo: 4,
  },
  {
    title: 'Discount code not applied at checkout',
    description: 'The code WINTER26 shows as valid but the total does not change.',
    category: 'BILLING',
    priority: 'MEDIUM',
    status: 'RESOLVED',
    requester: 'customer',
    assignee: 'agent',
    hoursAgo: 40,
    comments: [{ author: 'agent', body: 'Fixed: the code only applied to annual plans. Credit added.' }],
  },
  {
    title: 'Feature question: custom fields on tickets',
    description: 'Can we add our own custom fields (e.g. order number) to support tickets?',
    category: 'OTHER',
    priority: 'LOW',
    status: 'OPEN',
    requester: 'customer2',
    hoursAgo: 26,
  },
];

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const ids: Record<string, string> = {};
  for (const u of USERS) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role },
      create: { name: u.name, email: u.email, role: u.role, passwordHash },
    });
    ids[u.key] = user.id;
  }
  console.log(`[seed] ${USERS.length} demo users ready (password: ${DEMO_PASSWORD})`);

  if ((await prisma.ticket.count()) > 0) {
    console.log('[seed] tickets already exist - skipping sample tickets');
    return;
  }

  let number = 1001;
  // Oldest first so ticket numbers grow with creation time.
  const ordered = [...TICKETS].sort((a, b) => b.hoursAgo - a.hoursAgo);

  for (const t of ordered) {
    const createdAt = new Date(Date.now() - t.hoursAgo * 60 * 60 * 1000);
    const requesterId = ids[t.requester];
    const assigneeId = t.assignee ? ids[t.assignee] : null;
    const isDone = t.status === 'RESOLVED' || t.status === 'CLOSED';

    const ticket = await prisma.ticket.create({
      data: {
        number: number++,
        title: t.title,
        description: t.description,
        category: t.category,
        priority: t.priority,
        priorityRank: PRIORITY_WEIGHT[t.priority],
        status: t.status,
        dueAt: calculateDueAt(t.priority, createdAt),
        resolvedAt: isDone ? new Date(createdAt.getTime() + 60 * 60 * 1000) : null,
        createdAt,
        requesterId,
        assigneeId,
      },
    });

    const events: { type: string; actorId: string; fromValue: string | null; toValue: string | null }[] = [
      { type: 'CREATED', actorId: requesterId, fromValue: null, toValue: 'OPEN' },
    ];
    if (t.assignee) {
      const assignee = USERS.find((u) => u.key === t.assignee)!;
      events.push({ type: 'ASSIGNED', actorId: ids[t.assignee], fromValue: null, toValue: assignee.name });
    }
    if (t.status !== 'OPEN') {
      events.push({
        type: 'STATUS_CHANGED',
        actorId: assigneeId ?? requesterId,
        fromValue: 'OPEN',
        toValue: t.status,
      });
    }

    await prisma.ticketEvent.createMany({
      data: events.map((e, i) => ({
        ...e,
        ticketId: ticket.id,
        createdAt: new Date(createdAt.getTime() + i * 5 * 60 * 1000),
      })),
    });

    if (t.comments?.length) {
      await prisma.comment.createMany({
        data: t.comments.map((c, i) => ({
          ticketId: ticket.id,
          authorId: ids[c.author],
          body: c.body,
          isInternal: c.isInternal ?? false,
          createdAt: new Date(createdAt.getTime() + (i + 1) * 20 * 60 * 1000),
        })),
      });
    }
  }
  console.log(`[seed] ${TICKETS.length} sample tickets created`);
}

main()
  .catch((err) => {
    console.error('[seed] failed', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
