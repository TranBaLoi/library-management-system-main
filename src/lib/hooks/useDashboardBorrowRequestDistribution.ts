import { DashboardApi } from '@/api';
import { BorrowRequestDistributionResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch borrow request distribution by status data
 */
export function useDashboardBorrowRequestDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'borrow-request-distribution'],
    queryFn: async (): Promise<BorrowRequestDistributionResponse> => {
      return DashboardApi.getBorrowRequestDistribution();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
