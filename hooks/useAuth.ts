'use client';
import useSWR from 'swr';
import { authFetcher } from '@/lib/fetcher';

interface MeResponse {
  user: {
    email: string;
    role: 'SUBSIDIARY_OFFICER' | 'CORPORATE_ANALYST' | 'GLOBAL_ADMIN';
    tenantId: string;
    tenantName: string;
    sectorProfile: 'FINANCIAL' | 'AGRICULTURE' | 'LEISURE';
    region: string;
  };
}

export function useAuth() {
  const { data, error, isLoading } = useSWR<MeResponse>('/api/auth/me', authFetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return { user: data?.user, isLoading, error };
}
