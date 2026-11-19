import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { getErrorMessage } from '@/lib/apiClient';
import type { LoginInput } from '../api';
import { LoginForm } from '../components/LoginForm';
import { useLogin } from '../hooks/useAuth';

const DEMO_PASSWORD = 'Password123!';
const DEMO_ACCOUNTS = [
  { label: 'Agent', email: 'agent@queuedesk.test' },
  { label: 'Admin', email: 'admin@queuedesk.test' },
  { label: 'Customer', email: 'customer@queuedesk.test' },
];

export default function LoginPage() {
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;
  const login = useLogin(from);
  const [prefill, setPrefill] = useState<LoginInput>();

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Sign in to QueueDesk</h1>
      <p className="mt-1 text-sm text-slate-500">
        New here?{' '}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Create a customer account
        </Link>
      </p>

      <div className="mt-6">
        <LoginForm
          onSubmit={(values) => login.mutate(values)}
          isSubmitting={login.isPending}
          error={login.isError ? getErrorMessage(login.error) : undefined}
          prefill={prefill}
        />
      </div>

      <div className="mt-6 rounded-lg border border-dashed border-slate-300 p-3">
        <p className="text-xs font-medium text-slate-600">
          Demo accounts (password <code className="font-mono">{DEMO_PASSWORD}</code>)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO_ACCOUNTS.map((account) => (
            <button
              key={account.email}
              type="button"
              onClick={() => setPrefill({ email: account.email, password: DEMO_PASSWORD })}
              className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200"
            >
              {account.label}
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
