import { BookItemApi } from '@/api';
import { BookItemWithBook } from '@/types';
import { useQuery } from '@tanstack/react-query';

export function useBookItems(params?: {
  page?: number;
  limit?: number;
  search?: string;
  bookId?: number;
  condition?: string;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) {
  return useQuery({
    queryKey: ['bookItems', params],
    queryFn: async (): Promise<{
      bookItems: BookItemWithBook[];
      pagination: { total: number };
    }> => {
      const response = await BookItemApi.getBookItems(params);
      return {
        bookItems: response.bookItems as BookItemWithBook[],
        pagination: { total: response.pagination.total },
      };
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
