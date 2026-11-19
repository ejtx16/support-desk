import { Link } from 'react-router-dom';
import { getErrorMessage } from '@/lib/apiClient';
import { RegisterForm } from '../components/RegisterForm';
import { useRegister } from '../hooks/useAuth';

export default function RegisterPage() {
  const registerUser = useRegister();

  return (
    <>
      <h1 className="text-xl font-semibold text-slate-900">Create your account</h1>
      <p className="mt-1 text-sm text-slate-500">
        Already have one?{' '}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Sign in
        </Link>
      </p>
      <div className="mt-6">
        <RegisterForm
          onSubmit={(values) => registerUser.mutate(values)}
          isSubmitting={registerUser.isPending}
          error={registerUser.isError ? getErrorMessage(registerUser.error) : undefined}
        />
      </div>
    </>
  );
}
