'use client';
import { DynamicMetricForm } from '@/components/forms/DynamicMetricForm';
import { RoleGuard } from '@/components/layout/RoleGuard';

export default function DataEntryPage() {
  return (
    <RoleGuard allow={['SUBSIDIARY_OFFICER']}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold text-ink-900 dark:text-ink-50">Data entry</h1>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            Submit this month&apos;s metrics. CO₂e is computed server-side from emission factors —
            you only enter raw consumption.
          </p>
        </div>
        <DynamicMetricForm />
      </div>
    </RoleGuard>
  );
}
