'use client';

import useSWR from 'swr';
import { apiFetch } from '@/lib/api-client';
import { meToUserProfile, type MeResponse } from '@/lib/adapters';
import { useAuth } from '@/components/auth-provider';

export function useMe() {
  const { user, loading: authLoading } = useAuth();
  const { data, error, mutate, isLoading } = useSWR<MeResponse>(user ? '/api/user/me' : null, apiFetch);

  return {
    me: data,
    profile: data && user ? meToUserProfile(data, user) : null,
    error,
    loading: authLoading || isLoading,
    mutate,
  };
}
