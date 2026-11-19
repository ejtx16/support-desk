import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button, FormField, Input, Select, Textarea } from '@/components/ui';
import { CATEGORY_LABELS, PRIORITY_LABELS, toOptions } from '@/lib/labels';
import { TICKET_CATEGORIES, TICKET_PRIORITIES, type CreateTicketInput } from '@/types/api';

/** Mirrors the server's createTicketSchema so users get instant feedback. */
const ticketFormSchema = z.object({
  title: z.string().trim().min(5, 'Title must be at least 5 characters').max(120),
  description: z.string().trim().min(10, 'Description must be at least 10 characters').max(5000),
  category: z.enum(TICKET_CATEGORIES, { errorMap: () => ({ message: 'Choose a category' }) }),
  priority: z.enum(TICKET_PRIORITIES),
});

const SLA_HINT: Record<CreateTicketInput['priority'], string> = {
  URGENT: 'Response target: 4 hours',
  HIGH: 'Response target: 24 hours',
  MEDIUM: 'Response target: 48 hours',
  LOW: 'Response target: 72 hours',
};

interface TicketFormProps {
  onSubmit: (values: CreateTicketInput) => void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  serverErrors?: Partial<Record<keyof CreateTicketInput, string>>;
}

export function TicketForm({
  onSubmit,
  onCancel,
  isSubmitting,
  serverErrors = {},
}: TicketFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CreateTicketInput>({
    resolver: zodResolver(ticketFormSchema),
    defaultValues: { title: '', description: '', category: '' as never, priority: 'MEDIUM' },
  });

  const priority = watch('priority');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
      <FormField label="Title" error={errors.title?.message ?? serverErrors.title}>
        <Input placeholder="Short summary of the problem" {...register('title')} />
      </FormField>

      <FormField
        label="Description"
        error={errors.description?.message ?? serverErrors.description}
        hint="Include steps to reproduce, error messages, and what you expected to happen."
      >
        <Textarea rows={6} {...register('description')} />
      </FormField>

      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Category" error={errors.category?.message ?? serverErrors.category}>
          <Select
            placeholder="Select a category"
            options={toOptions(CATEGORY_LABELS)}
            {...register('category')}
          />
        </FormField>
        <FormField label="Priority" hint={SLA_HINT[priority]}>
          <Select options={toOptions(PRIORITY_LABELS)} {...register('priority')} />
        </FormField>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        {onCancel && (
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" isLoading={isSubmitting}>
          Submit ticket
        </Button>
      </div>
    </form>
  );
}
