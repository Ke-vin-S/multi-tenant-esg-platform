export const SCOPE_LABELS: Record<string, { short: string; description: string }> = {
  SCOPE_1: {
    short: 'Scope 1 · Direct',
    description: 'Direct emissions from owned/controlled operations',
  },
  SCOPE_2: {
    short: 'Scope 2 · Grid',
    description: 'Indirect emissions from purchased electricity',
  },
  SCOPE_3: {
    short: 'Scope 3 · Value chain',
    description: 'All other indirect upstream/downstream emissions',
  },
};

export function scopeShort(scope: string): string {
  return SCOPE_LABELS[scope]?.short ?? scope.replace('_', ' ');
}
