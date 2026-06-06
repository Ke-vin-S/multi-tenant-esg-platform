'use client';
import useSWR from 'swr';
import type { MetricDefinitionDTO, SectorProfile } from '@/types';
import { authFetcher } from '@/lib/fetcher';

interface DefsResponse {
  sector: SectorProfile;
  definitions: MetricDefinitionDTO[];
}

export function useMetricDefinitions(sector?: SectorProfile) {
  const url = sector ? `/api/metrics/definitions?sector=${sector}` : '/api/metrics/definitions';
  const { data, error, isLoading } = useSWR<DefsResponse>(url, authFetcher, {
    revalidateOnFocus: false,
  });
  return { definitions: data?.definitions, sector: data?.sector, isLoading, error };
}
