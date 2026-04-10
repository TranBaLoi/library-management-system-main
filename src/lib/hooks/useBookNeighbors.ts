import { RecommendationApi } from '@/api';
import { BookWithAuthor } from '@/types/book';
import { useQuery } from '@tanstack/react-query';

export const bookNeighborsQueryKey = (bookId: number, n?: number, offset?: number) =>
  ['book-neighbors', bookId, n, offset] as const;

/**
 * Hook to fetch similar/neighbor books for a specific book from Gorse API
 */
export function useBookNeighbors(bookId: number, n?: number, offset?: number) {
  return useQuery({
    queryKey: bookNeighborsQueryKey(bookId, n, offset),
    queryFn: async (): Promise<BookWithAuthor[]> => {
      return await RecommendationApi.getBookNeighbors(bookId, n, offset);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
    enabled: !!bookId && bookId > 0,
  });
}
