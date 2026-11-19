import { Card, CardBody, CardHeader } from '@/components/ui';
import type { Role } from '@/types/api';

const ACCESS: Record<Role, string[]> = {
  CUSTOMER: [
    'Open new support tickets',
    'See and reply to your own tickets',
    'Close a ticket once your problem is solved',
  ],
  AGENT: [
    'See every ticket in the queue',
    'Claim tickets and change their status or priority',
    'Post public replies and internal notes',
  ],
  ADMIN: [
    'Everything an agent can do',
    'Assign tickets to any agent',
    'See queue health on the dashboard',
  ],
};

/** Plain-language summary of what the user's role allows. */
export function RoleAccessCard({ role }: { role: Role }) {
  return (
    <Card>
      <CardHeader title="What you can do" />
      <CardBody>
        <ul className="space-y-2 text-sm text-slate-700">
          {ACCESS[role].map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden="true" className="text-brand-600">
                ✓
              </span>
              {item}
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}
