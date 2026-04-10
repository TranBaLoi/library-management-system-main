import { BorrowRequestApi } from '@/api';
import { toaster } from '@/components/ui/Toaster';
import { BorrowRequestResponse, CreateBorrowRequestData } from '@/types/borrow-request';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useCreateBorrowRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateBorrowRequestData): Promise<BorrowRequestResponse> => {
      return BorrowRequestApi.createBorrowRequest(data);
    },
    onSuccess: response => {
      // Invalidate borrow requests queries
      queryClient.invalidateQueries({ queryKey: ['borrow-requests'], exact: false });
      queryClient.invalidateQueries({
        queryKey: ['borrow-requests', 'user', response.borrowRequest.userId],
      });

      // Show success message based on response
      toaster.create({
        title: 'Success!',
        description: response.message || 'Borrow request created successfully!',
        type: 'success',
        duration: 5000,
      });
    },
    onError: (error: unknown) => {
      toaster.create({
        title: 'Error!',
        description:
          error instanceof Error
            ? error.message
            : 'An error occurred while creating your borrow request!',
        type: 'error',
        duration: 5000,
      });
    },
  });
}
