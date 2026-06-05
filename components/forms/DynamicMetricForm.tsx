'use client';
import { useState } from 'react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { MonthPicker } from './MonthPicker';
import { FileUploadZone } from './FileUploadZone';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useMetricDefinitions } from '@/hooks/useMetricDefinitions';
import { EmptyState } from '@/components/ui/EmptyState';

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/**
 * Renders one numeric input per MetricDefinition for the user's sector.
 * Submits each non-empty value as a separate MetricEntry — the API
 * recomputes CO2e server-side from the raw value + EF map.
 */
export function DynamicMetricForm() {
  const { definitions, sector, isLoading } = useMetricDefinitions();
  const [month, setMonth] = useState(currentMonth());
  const [values, setValues] = useState<Record<string, string>>({});
  const [evidenceUrl, setEvidenceUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ created: number; errors: string[] } | null>(null);

  if (isLoading) return <LoadingSpinner label="Loading metric definitions…" />;
  if (!definitions || definitions.length === 0) {
    return <EmptyState title="No metrics for this sector" description="Contact an administrator to seed metric definitions." />;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    const errors: string[] = [];
    let created = 0;
    const reportingMonth = `${month}-01`;

    for (const def of definitions ?? []) {
      const raw = values[def.id];
      if (raw === undefined || raw === '') continue;
      const num = Number(raw);
      if (!Number.isFinite(num) || num < 0) {
        errors.push(`${def.name}: must be a non-negative number`);
        continue;
      }
      const res = await fetch('/api/metrics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          metricDefinitionId: def.id,
          rawValue: num,
          reportingMonth,
          evidenceUrl,
        }),
      });
      if (res.ok) created += 1;
      else {
        const j = await res.json().catch(() => ({}));
        errors.push(`${def.name}: ${j.error ?? res.statusText}`);
      }
    }

    setSubmitting(false);
    setResult({ created, errors });
    if (created > 0 && errors.length === 0) {
      setValues({});
      setEvidenceUrl(null);
    }
  }

  const carbon = definitions.filter((d) => d.scope !== null);
  const nonCarbon = definitions.filter((d) => d.scope === null);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader title="Submission details" subtitle={`Sector: ${sector}`} />
        <div className="grid gap-4 sm:grid-cols-2">
          <MonthPicker value={month} onChange={setMonth} />
          <div>
            <span className="mb-1 block text-sm font-medium text-ink-700">Evidence (optional)</span>
            <FileUploadZone
              onUploaded={setEvidenceUrl}
              onClear={() => setEvidenceUrl(null)}
              uploadedFilename={evidenceUrl ?? undefined}
            />
          </div>
        </div>
      </Card>

      {carbon.length > 0 && (
        <Card>
          <CardHeader title="Carbon-impacting metrics" subtitle="These feed into Scope 1 / Scope 2 totals." />
          <FieldGrid defs={carbon} values={values} onChange={(id, v) => setValues((p) => ({ ...p, [id]: v }))} />
        </Card>
      )}

      {nonCarbon.length > 0 && (
        <Card>
          <CardHeader title="Resource & social metrics" subtitle="Tracked separately — no CO₂e applied." />
          <FieldGrid defs={nonCarbon} values={values} onChange={(id, v) => setValues((p) => ({ ...p, [id]: v }))} />
        </Card>
      )}

      <div className="flex items-center justify-between">
        <div className="text-xs text-ink-500">
          Leave a field blank to skip it. Each filled field creates one MetricEntry.
        </div>
        <Button type="submit" loading={submitting} disabled={submitting}>
          Submit metrics
        </Button>
      </div>

      {result && (
        <Card className={result.errors.length === 0 ? 'border-brand-200 bg-brand-50' : 'border-amber-200 bg-amber-50'}>
          <div className="text-sm font-medium text-ink-900">
            {result.created > 0 && `Saved ${result.created} entr${result.created === 1 ? 'y' : 'ies'}.`}
            {result.created === 0 && result.errors.length === 0 && 'No values entered.'}
          </div>
          {result.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-amber-800">
              {result.errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          )}
        </Card>
      )}
    </form>
  );
}

function FieldGrid({
  defs,
  values,
  onChange,
}: {
  defs: Array<{ id: string; name: string; unit: string; scope: string | null }>;
  values: Record<string, string>;
  onChange: (id: string, v: string) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {defs.map((d) => (
        <label key={d.id} className="block">
          <span className="mb-1 flex items-center gap-2 text-sm font-medium text-ink-700">
            {d.name}
            {d.scope && <Badge tone="neutral">{d.scope.replace('_', ' ')}</Badge>}
          </span>
          <Input
            type="number"
            inputMode="decimal"
            min={0}
            step="any"
            value={values[d.id] ?? ''}
            placeholder="0"
            onChange={(e) => onChange(d.id, e.target.value)}
            trailing={d.unit}
          />
        </label>
      ))}
    </div>
  );
}
