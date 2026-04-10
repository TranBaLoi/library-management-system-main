import { RecommendationApi } from '@/api';
import { BookWithAuthor } from '@/types/book';
import { useQuery } from '@tanstack/react-query';

export const recommendationsQueryKey = ['recommendations'] as const;

/**
 * Hook to fetch recommended books for the current user
 * Only fetches if user is authenticated
 */
export function useRecommendations(enabled: boolean = true) {
  return useQuery({
    queryKey: recommendationsQueryKey,
    queryFn: async (): Promise<BookWithAuthor[]> => {
      return await RecommendationApi.getRecommendations();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    enabled,
    retry: false,
  });
}
