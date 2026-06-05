'use client';
import { Input } from '@/components/ui/Input';

export function MonthPicker({
  value,
  onChange,
  label = 'Reporting month',
}: {
  value: string;             // YYYY-MM
  onChange: (val: string) => void;
  label?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-700 dark:text-ink-200">{label}</span>
      <Input
        type="month"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        max={currentMonth()}
        required
      />
    </label>
  );
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}
