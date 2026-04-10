import { DashboardApi } from '@/api';
import { BookCopiesDistributionResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch book copies distribution by status data
 */
export function useDashboardBookCopiesDistribution() {
  return useQuery({
    queryKey: ['dashboard', 'book-copies-distribution'],
    queryFn: async (): Promise<BookCopiesDistributionResponse> => {
      return DashboardApi.getBookCopiesDistribution();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
