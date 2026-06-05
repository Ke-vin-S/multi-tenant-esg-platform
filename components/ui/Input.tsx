import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  trailing?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, trailing, ...rest },
  ref,
) {
  return (
    <div className="relative">
      <input
        ref={ref}
        className={cn(
          'block w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm placeholder-ink-400',
          'focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500',
          'disabled:bg-ink-50 disabled:text-ink-400',
          'dark:border-ink-700 dark:bg-ink-900 dark:text-ink-50 dark:placeholder-ink-500',
          'dark:focus:border-brand-400 dark:focus:ring-brand-400',
          'dark:disabled:bg-ink-800 dark:disabled:text-ink-600',
          'dark:[color-scheme:dark]',
          trailing && 'pr-12',
          className,
        )}
        {...rest}
      />
      {trailing && (
        <span className="absolute inset-y-0 right-3 flex items-center text-xs text-ink-500 dark:text-ink-400">
          {trailing}
        </span>
      )}
    </div>
  );
});
