import { Avatar, Badge } from '@/components/ui';
import { cn } from '@/lib/cn';
import { formatDateTime, formatRelative } from '@/lib/formatDate';
import type { Comment, TicketEvent } from '@/types/api';
import { buildFeed, describeEvent } from '../feed';

function CommentItem({ comment }: { comment: Comment }) {
  return (
    <li className="flex gap-3">
      <Avatar name={comment.author.name} />
      <div
        className={cn(
          'flex-1 rounded-lg border px-4 py-3',
          comment.isInternal ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white',
        )}
      >
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-slate-900">{comment.author.name}</span>
          {comment.author.role !== 'CUSTOMER' && <Badge tone="purple">Staff</Badge>}
          {comment.isInternal && <Badge tone="amber">Internal note</Badge>}
          <time
            dateTime={comment.createdAt}
            title={formatDateTime(comment.createdAt)}
            className="text-xs text-slate-500"
          >
            {formatRelative(comment.createdAt)}
          </time>
        </div>
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-slate-700">{comment.body}</p>
      </div>
    </li>
  );
}

function EventItem({ event }: { event: TicketEvent }) {
  return (
    <li className="flex items-center gap-3 pl-2.5 text-xs text-slate-500">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-slate-300" />
      <span>
        <span className="font-medium text-slate-700">{event.actor.name}</span>{' '}
        {describeEvent(event)}
      </span>
      <time dateTime={event.createdAt} title={formatDateTime(event.createdAt)}>
        · {formatRelative(event.createdAt)}
      </time>
    </li>
  );
}

interface ActivityFeedProps {
  comments: Comment[];
  events: TicketEvent[];
}

export function ActivityFeed({ comments, events }: ActivityFeedProps) {
  const feed = buildFeed(comments, events);
  return (
    <ol aria-label="Ticket activity" className="space-y-4">
      {feed.map((item) =>
        item.kind === 'comment' ? (
          <CommentItem key={`c-${item.comment.id}`} comment={item.comment} />
        ) : (
          <EventItem key={`e-${item.event.id}`} event={item.event} />
        ),
      )}
    </ol>
  );
}
