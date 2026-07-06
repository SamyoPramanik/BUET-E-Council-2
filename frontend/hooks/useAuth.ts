import useSWR from 'swr';
import { fetcher } from '../lib/api';

export type Role = 'admin' | 'moderator' | 'viewer';

export function useAuth() {
  const { data: response, error, isLoading } = useSWR('/auth/me', fetcher, {
    shouldRetryOnError: false
  });

  const user = response?.data ?? null;
  const role: Role | null = user?.role ?? null;

  return {
    user,
    role,
    isLoading,
    error,
    // admin and moderator ("staff") can create/edit/delete; viewers are read-only.
    canEdit: role === 'admin' || role === 'moderator',
    isAdmin: role === 'admin',
  };
}
