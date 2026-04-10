import { DashboardApi } from '@/api';
import { TopActiveUsersResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch top 5 most active users data
 */
export function useDashboardTopActiveUsers() {
  return useQuery({
    queryKey: ['dashboard', 'top-active-users'],
    queryFn: async (): Promise<TopActiveUsersResponse> => {
      return DashboardApi.getTopActiveUsers();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
