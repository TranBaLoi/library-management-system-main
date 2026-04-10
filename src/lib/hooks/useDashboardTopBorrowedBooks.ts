import { DashboardApi } from '@/api';
import { TopBorrowedBooksResponse } from '@/types/dashboard';
import { useQuery } from '@tanstack/react-query';

/**
 * Hook to fetch top 10 most borrowed books data
 */
export function useDashboardTopBorrowedBooks() {
  return useQuery({
    queryKey: ['dashboard', 'top-borrowed-books'],
    queryFn: async (): Promise<TopBorrowedBooksResponse> => {
      return DashboardApi.getTopBorrowedBooks();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}
