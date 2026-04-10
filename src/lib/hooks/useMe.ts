import { AuthApi } from '@/api';
import { getAccessToken } from '@/lib/utils/auth-utils';
import { AuthUser } from '@/types/auth';
import { useQuery } from '@tanstack/react-query';

export const meQueryKey = ['me'] as const;

export function useMe() {
  return useQuery({
    queryKey: meQueryKey,
    queryFn: async (): Promise<AuthUser | null> => {
      // First check if we have an access token
      const token = getAccessToken();
      if (!token) {
        return null;
      }

      try {
        return await AuthApi.me();
      } catch (error) {
        // The fetchWithAuth function now handles refresh automatically for 401 responses
        console.warn('Failed to get user profile:', error);
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
    // Only run the query if we're in the browser (not during SSR)
    enabled: typeof window !== 'undefined',
  });
}
