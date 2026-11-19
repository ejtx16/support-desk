import { ButtonLink } from '@/components/ui';

interface NotFoundPageProps {
  message?: string;
}

export default function NotFoundPage({
  message = "The page you're looking for doesn't exist.",
}: NotFoundPageProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-semibold text-brand-600">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-slate-900">Not found</h1>
      <p className="mt-2 text-sm text-slate-500">{message}</p>
      <ButtonLink to="/" variant="secondary" className="mt-6">
        Go home
      </ButtonLink>
    </div>
  );
}
