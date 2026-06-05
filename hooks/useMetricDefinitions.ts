'use client';
import useSWR from 'swr';
import type { MetricDefinitionDTO, SectorProfile } from '@/types';

interface DefsResponse {
  sector: SectorProfile;
  definitions: MetricDefinitionDTO[];
}

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

export function useMetricDefinitions(sector?: SectorProfile) {
  const url = sector ? `/api/metrics/definitions?sector=${sector}` : '/api/metrics/definitions';
  const { data, error, isLoading } = useSWR<DefsResponse>(url, fetcher, {
    revalidateOnFocus: false,
  });
  return { definitions: data?.definitions, sector: data?.sector, isLoading, error };
}
