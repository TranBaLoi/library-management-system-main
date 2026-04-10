import { RecommendationApi } from '@/api';
import { BookWithAuthor } from '@/types/book';
import { useQuery } from '@tanstack/react-query';

export const latestBooksQueryKey = (n?: number, offset?: number) =>
  ['latest-books', n, offset] as const;

/**
 * Hook to fetch latest books from Gorse API
 */
export function useLatestBooks(n?: number, offset?: number) {
  return useQuery({
    queryKey: latestBooksQueryKey(n, offset),
    queryFn: async (): Promise<BookWithAuthor[]> => {
      return await RecommendationApi.getLatestBooks(n, offset);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
