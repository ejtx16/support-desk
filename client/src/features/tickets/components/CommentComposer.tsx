import { useState, type FormEvent } from 'react';
import { Button, Textarea } from '@/components/ui';
import { cn } from '@/lib/cn';
import type { CreateCommentInput } from '@/types/api';

interface CommentComposerProps {
  onSubmit: (input: CreateCommentInput) => Promise<unknown>;
  isSubmitting?: boolean;
  /** Staff can switch between a public reply and an internal note. */
  allowInternal: boolean;
  disabledReason?: string;
}

export function CommentComposer({
  onSubmit,
  isSubmitting,
  allowInternal,
  disabledReason,
}: CommentComposerProps) {
  const [body, setBody] = useState('');
  const [isInternal, setIsInternal] = useState(false);

  if (disabledReason) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-500">
        {disabledReason}
      </p>
    );
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      await onSubmit({ body: body.trim(), isInternal });
      setBody('');
    } catch {
      // Error toast is raised by the mutation; keep the draft so nothing is lost.
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      {allowInternal && (
        <div
          role="tablist"
          aria-label="Reply type"
          className="inline-flex rounded-lg bg-slate-100 p-1 text-sm"
        >
          {[
            { value: false, label: 'Public reply' },
            { value: true, label: 'Internal note' },
          ].map((tab) => (
            <button
              key={tab.label}
              type="button"
              role="tab"
              aria-selected={isInternal === tab.value}
              onClick={() => setIsInternal(tab.value)}
              className={cn(
                'rounded-md px-3 py-1 font-medium transition-colors',
                isInternal === tab.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}
      <Textarea
        aria-label={isInternal ? 'Internal note' : 'Reply'}
        placeholder={isInternal ? 'Only visible to the support team…' : 'Write a reply…'}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        className={cn(isInternal && 'border-amber-300 bg-amber-50/50')}
      />
      <div className="flex justify-end">
        <Button type="submit" isLoading={isSubmitting} disabled={!body.trim()}>
          {isInternal ? 'Add note' : 'Send reply'}
        </Button>
      </div>
    </form>
  );
}
