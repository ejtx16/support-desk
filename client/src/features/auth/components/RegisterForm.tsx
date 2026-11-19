import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FormField, Input } from '@/components/ui';
import type { RegisterInput } from '../api';

/** Mirrors the server's registerSchema. */
const registerSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80),
  email: z.string().trim().min(1, 'Email is required').email('Enter a valid email'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(/[A-Za-z]/, 'Password must contain a letter')
    .regex(/\d/, 'Password must contain a number'),
});

interface RegisterFormProps {
  onSubmit: (values: RegisterInput) => void;
  isSubmitting?: boolean;
  error?: string;
}

export function RegisterForm({ onSubmit, isSubmitting, error }: RegisterFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

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
      <FormField label="Full name" error={errors.name?.message}>
        <Input autoComplete="name" {...register('name')} />
      </FormField>
      <FormField label="Email" error={errors.email?.message}>
        <Input type="email" autoComplete="email" {...register('email')} />
      </FormField>
      <FormField
        label="Password"
        error={errors.password?.message}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input type="password" autoComplete="new-password" {...register('password')} />
      </FormField>
      <Button type="submit" fullWidth isLoading={isSubmitting}>
        Create account
      </Button>
    </form>
  );
}
