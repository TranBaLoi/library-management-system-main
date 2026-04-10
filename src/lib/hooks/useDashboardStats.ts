import { DashboardApi } from '@/api';
import { DashboardStatsResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch dashboard statistics
 */
export function useDashboardStats() {
  return useQuery({
    queryKey: ['dashboard', 'stats'],
    queryFn: async (): Promise<DashboardStatsResponse> => {
      return DashboardApi.getStats();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
