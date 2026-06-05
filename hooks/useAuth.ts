'use client';
import useSWR from 'swr';

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

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('Failed');
  return res.json();
};

export function useAuth() {
  const { data, error, isLoading } = useSWR<MeResponse>('/api/auth/me', fetcher, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  });
  return { user: data?.user, isLoading, error };
}
