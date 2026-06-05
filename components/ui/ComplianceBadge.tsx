import { Badge } from './Badge';

type Status = 'submitted' | 'late' | 'missing';

const LABELS: Record<Status, string> = {
  submitted: 'On time',
  late:      'Late',
  missing:   'Missing',
};

const TONES = {
  submitted: 'green',
  late:      'amber',
  missing:   'red',
} as const;

export function ComplianceBadge({ status }: { status: Status }) {
  return <Badge tone={TONES[status]}>{LABELS[status]}</Badge>;
}
