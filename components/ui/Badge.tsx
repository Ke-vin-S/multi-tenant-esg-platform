import { cn } from '@/lib/utils';

type Tone = 'neutral' | 'green' | 'amber' | 'red' | 'blue' | 'purple';

const TONES: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700 dark:bg-ink-800 dark:text-ink-200',
  green:   'bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-200',
  amber:   'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200',
  red:     'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200',
  blue:    'bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-200',
  purple:  'bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-200',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
