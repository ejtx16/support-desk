import { Avatar, Badge, Card, CardBody, type BadgeTone } from '@/components/ui';
import { formatDateTime } from '@/lib/formatDate';
import { ROLE_LABELS } from '@/lib/labels';
import type { Role, User } from '@/types/api';

const ROLE_TONES: Record<Role, BadgeTone> = { CUSTOMER: 'gray', AGENT: 'blue', ADMIN: 'purple' };

function DetailRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-3 sm:gap-4">
      <dt className="text-sm font-medium text-slate-500">{label}</dt>
      <dd className="text-sm text-slate-900 sm:col-span-2">{children}</dd>
    </div>
  );
}

/** Who the signed-in user is: avatar, name, role and account details. */
export function ProfileCard({ user }: { user: User }) {
  return (
    <Card>
      <CardBody className="flex items-center gap-4 border-b border-slate-100 py-6">
        <Avatar name={user.name} size="lg" />
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-slate-900">{user.name}</h2>
          <p className="truncate text-sm text-slate-500">{user.email}</p>
          <Badge tone={ROLE_TONES[user.role]} className="mt-2">
            {ROLE_LABELS[user.role]}
          </Badge>
        </div>
      </CardBody>
      <CardBody>
        <dl className="divide-y divide-slate-100">
          <DetailRow label="Full name">{user.name}</DetailRow>
          <DetailRow label="Email">{user.email}</DetailRow>
          <DetailRow label="Role">{ROLE_LABELS[user.role]}</DetailRow>
          {user.createdAt && (
            <DetailRow label="Member since">{formatDateTime(user.createdAt)}</DetailRow>
          )}
        </dl>
      </CardBody>
    </Card>
  );
}
