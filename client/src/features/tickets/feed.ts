import { PRIORITY_LABELS, STATUS_LABELS } from '@/lib/labels';
import type { Comment, TicketEvent, TicketPriority, TicketStatus } from '@/types/api';

export type FeedItem =
  | { kind: 'comment'; at: string; comment: Comment }
  | { kind: 'event'; at: string; event: TicketEvent };

/** Merges replies and system events into one chronological thread. */
export function buildFeed(comments: Comment[], events: TicketEvent[]): FeedItem[] {
  return [
    ...comments.map((comment) => ({ kind: 'comment' as const, at: comment.createdAt, comment })),
    ...events.map((event) => ({ kind: 'event' as const, at: event.createdAt, event })),
  ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());
}

export function describeEvent(event: TicketEvent): string {
  switch (event.type) {
    case 'CREATED':
      return 'opened this ticket';
    case 'STATUS_CHANGED':
      return `changed status from ${STATUS_LABELS[event.fromValue as TicketStatus] ?? event.fromValue} to ${
        STATUS_LABELS[event.toValue as TicketStatus] ?? event.toValue
      }`;
    case 'PRIORITY_CHANGED':
      return `changed priority from ${PRIORITY_LABELS[event.fromValue as TicketPriority]} to ${
        PRIORITY_LABELS[event.toValue as TicketPriority]
      }`;
    case 'ASSIGNED':
      if (!event.toValue) return `unassigned ${event.fromValue ?? 'the ticket'}`;
      return event.toValue === event.actor.name
        ? 'assigned the ticket to themselves'
        : `assigned the ticket to ${event.toValue}`;
  }
}
