import { ReviewApi } from '@/api';
import { toaster } from '@/components/ui/Toaster';
import { CreateReviewData, ReviewStats, ReviewWithUser, UpdateReviewData } from '@/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

export function useBookReviews(
  bookId: number,
  params?: {
    page?: number;
    limit?: number;
    rating?: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }
) {
  return useQuery({
    queryKey: ['reviews', 'book', bookId, params],
    queryFn: async () => {
      return ReviewApi.getBookReviews(bookId, params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useReviewStats(bookId: number) {
  return useQuery({
    queryKey: ['reviews', 'stats', bookId],
    queryFn: async (): Promise<ReviewStats> => {
      return ReviewApi.getReviewStats(bookId);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewData): Promise<ReviewWithUser> => {
      return ReviewApi.createReview(data);
    },
    onSuccess: newReview => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'book', newReview.bookId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user', newReview.userId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', newReview.bookId] });
      queryClient.invalidateQueries({ queryKey: ['reviews'], exact: false });

      toaster.create({
        title: 'Success!',
        description: 'Your review has been added successfully!',
        type: 'success',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.message ||
        'An error occurred while adding your review!';
      toaster.create({
        title: 'Error!',
        description: errorMessage,
        type: 'error',
        duration: 5000,
      });
    },
  });
}

export function useUpdateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: number;
      data: UpdateReviewData;
    }): Promise<ReviewWithUser> => {
      return ReviewApi.updateReview(id, data);
    },
    onSuccess: updatedReview => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'book', updatedReview.bookId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user', updatedReview.userId] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats', updatedReview.bookId] });
      queryClient.invalidateQueries({ queryKey: ['reviews'], exact: false });

      toaster.create({
        title: 'Success!',
        description: 'Your review has been updated successfully!',
        type: 'success',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.message ||
        'An error occurred while updating your review!';
      toaster.create({
        title: 'Error!',
        description: errorMessage,
        type: 'error',
        duration: 5000,
      });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number): Promise<void> => {
      return ReviewApi.deleteReview(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', 'book'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'user'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', 'stats'] });
      queryClient.invalidateQueries({ queryKey: ['reviews'], exact: false });

      toaster.create({
        title: 'Success!',
        description: 'Your review has been deleted successfully!',
        type: 'success',
        duration: 3000,
      });
    },
    onError: (error: unknown) => {
      const apiError = error as ApiError;
      const errorMessage =
        apiError?.response?.data?.message ||
        apiError?.message ||
        'An error occurred while deleting your review!';
      toaster.create({
        title: 'Error!',
        description: errorMessage,
        type: 'error',
        duration: 5000,
      });
    },
  });
}
