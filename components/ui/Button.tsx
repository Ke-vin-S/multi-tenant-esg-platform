import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-brand-600 text-white hover:bg-brand-700 disabled:bg-brand-300 ' +
    'dark:bg-brand-500 dark:hover:bg-brand-400 dark:disabled:bg-brand-800',
  secondary:
    'bg-white text-ink-900 border border-ink-200 hover:bg-ink-50 disabled:text-ink-400 ' +
    'dark:bg-ink-900 dark:text-ink-50 dark:border-ink-700 dark:hover:bg-ink-800 dark:disabled:text-ink-600',
  ghost:
    'bg-transparent text-ink-700 hover:bg-ink-100 ' +
    'dark:text-ink-200 dark:hover:bg-ink-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 ' +
    'dark:bg-red-500 dark:hover:bg-red-400',
};

const SIZES: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-11 px-5 text-base',
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = 'primary', size = 'md', loading, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-ring disabled:cursor-not-allowed disabled:opacity-70',
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      )}
      {children}
    </button>
  );
});
