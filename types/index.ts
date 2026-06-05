import type { Role, SectorProfile, EmissionScope } from '@prisma/client';

export type { Role, SectorProfile, EmissionScope };

export interface SessionUser {
  email: string;
  role: Role;
  tenantId: string;
  tenantName: string;
  sectorProfile: SectorProfile;
}

export interface MetricDefinitionDTO {
  id: string;
  name: string;
  metricType: string;
  unit: string;
  scope: EmissionScope | null;
}

export interface MetricEntryDTO {
  id: string;
  metricDefinitionId: string;
  metricName: string;
  metricType: string;
  unit: string;
  scope: EmissionScope | null;
  rawValue: number;
  co2eKg: number | null;
  reportingMonth: string;
  evidenceUrl: string | null;
  submittedAt: string;
}

export interface TenantSummary {
  id: string;
  name: string;
  sectorProfile: SectorProfile;
  region: string;
  totalCo2eKg: number;
  entryCount: number;
  lastReportingMonth: string | null;
}
