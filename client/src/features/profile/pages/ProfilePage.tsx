import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui';
import { useLogout } from '@/features/auth/hooks/useAuth';
import { useCurrentUser } from '@/features/auth/store';
import { ProfileCard } from '../components/ProfileCard';
import { RoleAccessCard } from '../components/RoleAccessCard';

export default function ProfilePage() {
  const { user } = useCurrentUser();
  const logout = useLogout();
  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        title="Your profile"
        description="Your account details and what your role can do."
        actions={
          <Button variant="secondary" onClick={logout}>
            Sign out
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <ProfileCard user={user} />
        <RoleAccessCard role={user.role} />
      </div>
    </div>
  );
}
