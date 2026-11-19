import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { agentUser, customerUser } from '@/test/fixtures';
import type { Comment, TicketEvent } from '@/types/api';
import { buildFeed, describeEvent } from '../feed';
import { ActivityFeed } from './ActivityFeed';

const event = (overrides: Partial<TicketEvent>): TicketEvent => ({
  id: 'e',
  type: 'CREATED',
  fromValue: null,
  toValue: 'OPEN',
  createdAt: '2026-01-01T10:00:00Z',
  actor: customerUser,
  ...overrides,
});

const comment = (overrides: Partial<Comment>): Comment => ({
  id: 'c',
  body: 'Hello',
  isInternal: false,
  createdAt: '2026-01-01T11:00:00Z',
  author: agentUser,
  ...overrides,
});

describe('describeEvent', () => {
  it('describes each event type in plain English', () => {
    expect(describeEvent(event({ type: 'CREATED' }))).toBe('opened this ticket');
    expect(
      describeEvent(event({ type: 'STATUS_CHANGED', fromValue: 'OPEN', toValue: 'IN_PROGRESS' })),
    ).toBe('changed status from Open to In progress');
    expect(
      describeEvent(event({ type: 'PRIORITY_CHANGED', fromValue: 'LOW', toValue: 'URGENT' })),
    ).toBe('changed priority from Low to Urgent');
    expect(
      describeEvent(event({ type: 'ASSIGNED', actor: agentUser, toValue: agentUser.name })),
    ).toBe('assigned the ticket to themselves');
    expect(describeEvent(event({ type: 'ASSIGNED', toValue: 'Sam Support' }))).toBe(
      'assigned the ticket to Sam Support',
    );
  });
});

describe('buildFeed', () => {
  it('interleaves comments and events chronologically', () => {
    const feed = buildFeed(
      [comment({ id: 'c1', createdAt: '2026-01-01T12:00:00Z' })],
      [
        event({ id: 'e1', createdAt: '2026-01-01T10:00:00Z' }),
        event({ id: 'e2', type: 'STATUS_CHANGED', createdAt: '2026-01-01T13:00:00Z' }),
      ],
    );
    expect(feed.map((i) => i.kind)).toEqual(['event', 'comment', 'event']);
  });
});

describe('<ActivityFeed />', () => {
  it('labels internal notes and staff replies', () => {
    render(
      <ActivityFeed
        events={[event({ id: 'e1' })]}
        comments={[
          comment({ id: 'c1', body: 'Public answer' }),
          comment({ id: 'c2', body: 'Secret', isInternal: true }),
        ]}
      />,
    );
    const items = within(screen.getByRole('list', { name: 'Ticket activity' })).getAllByRole(
      'listitem',
    );
    expect(items).toHaveLength(3);
    expect(screen.getByText('Internal note')).toBeInTheDocument();
    expect(screen.getAllByText('Staff')).toHaveLength(2);
  });
});
