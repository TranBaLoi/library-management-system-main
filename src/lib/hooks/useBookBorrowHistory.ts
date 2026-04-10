import { BorrowRecordApi } from '@/api';
import { BorrowRecordWithDetails } from '@/types/borrow-record';
import { useQuery } from '@tanstack/react-query';

export const bookBorrowHistoryQueryKey = (bookId: number) =>
  ['book-borrow-history', bookId] as const;

/**
 * Hook to fetch borrowing history for a specific book
 * Only available for ADMIN and LIBRARIAN roles
 */
export function useBookBorrowHistory(bookId: number, enabled: boolean = true) {
  return useQuery({
    queryKey: bookBorrowHistoryQueryKey(bookId),
    queryFn: async (): Promise<BorrowRecordWithDetails[]> => {
      const result = await BorrowRecordApi.getAllBorrowRecords({
        bookId,
        limit: 100, // Get more records for history
        page: 1,
      });
      return result.borrowRecords;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    enabled: enabled && bookId > 0,
  });
}
