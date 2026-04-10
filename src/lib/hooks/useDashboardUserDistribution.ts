import { DashboardApi } from '@/api';
import { UserDistributionResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch user distribution by role data
 */
export function useDashboardUserDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'user-distribution'],
    queryFn: async (): Promise<UserDistributionResponse> => {
      return DashboardApi.getUserDistribution();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
