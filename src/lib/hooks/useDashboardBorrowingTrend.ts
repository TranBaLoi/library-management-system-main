import { DashboardApi } from '@/api';
import { BorrowingTrendResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch borrowing trend data for the last 7 days
 */
export function useDashboardBorrowingTrend() {
  return useQuery({
    queryKey: ['dashboard', 'borrowing-trend'],
    queryFn: async (): Promise<BorrowingTrendResponse> => {
      return DashboardApi.getBorrowingTrend();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
