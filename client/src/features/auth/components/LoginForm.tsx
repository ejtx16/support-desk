import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FormField, Input } from '@/components/ui';
import type { LoginInput } from '../api';

const loginSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

interface LoginFormProps {
  onSubmit: (values: LoginInput) => void;
  isSubmitting?: boolean;
  /** Server-side error (e.g. invalid credentials). */
  error?: string;
  /** Lets the demo-account buttons pre-fill the form. */
  prefill?: LoginInput;
}

export function LoginForm({ onSubmit, isSubmitting, error, prefill }: LoginFormProps) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  useEffect(() => {
    if (prefill) reset(prefill);
  }, [prefill, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700"
        >
          {error}
        </div>
      )}
      <FormField label="Email" error={errors.email?.message}>
        <Input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          {...register('email')}
        />
      </FormField>
      <FormField label="Password" error={errors.password?.message}>
        <Input type="password" autoComplete="current-password" {...register('password')} />
      </FormField>
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Sign in
      </Button>
    </form>
  );
}
