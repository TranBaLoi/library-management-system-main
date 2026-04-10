import { RecommendationApi } from '@/api';
import { BookWithAuthor } from '@/types/book';
import { useQuery } from '@tanstack/react-query';

export const popularBooksQueryKey = (n?: number, category?: string) =>
  ['popular-books', n, category] as const;

/**
 * Hook to fetch popular books from Gorse API
 */
export function usePopularBooks(n?: number, category?: string) {
  return useQuery({
    queryKey: popularBooksQueryKey(n, category),
    queryFn: async (): Promise<BookWithAuthor[]> => {
      return await RecommendationApi.getPopularBooks(n, category);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: false,
  });
}
