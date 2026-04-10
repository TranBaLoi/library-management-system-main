import { BookItemApi, BorrowRecordApi, BorrowRequestApi } from '@/api';
import { SelectOption } from '@/components/forms/FormSelectSearch';
import { toaster } from '@/components/ui/Toaster';
import { ROUTES } from '@/constants';
import { useAllUsers, useDialog } from '@/lib/hooks';
import { BookItemWithBook } from '@/types';
import { BorrowRequestStatus, BorrowRequestWithBookAndUser } from '@/types/borrow-request';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export interface SelectedBookItem {
  bookItemId: number;
  bookId: number;
  requestId: number;
  bookTitle: string;
}

export function useBorrowRecordForm() {
  const router = useRouter();
  const { data: users } = useAllUsers();
  const { dialog, openDialog, handleConfirm, handleCancel: handleDialogCancel } = useDialog();

  // Form state
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [borrowRequests, setBorrowRequests] = useState<BorrowRequestWithBookAndUser[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [selectedBookItems, setSelectedBookItems] = useState<Map<string, SelectedBookItem[]>>(
    new Map()
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Book items data for each request
  const [bookItemsMap, setBookItemsMap] = useState<Map<number, BookItemWithBook[]>>(new Map());

  // Convert users to options
  const userOptions: SelectOption[] = useMemo(() => {
    if (!users) return [];
    return users
      .filter(user => user.role === 'READER')
      .map(user => ({
        value: user.id.toString(),
        label: `${user.fullName} (${user.email})`,
      }));
  }, [users]);

  // Fetch borrow requests when user is selected
  useEffect(() => {
    const fetchBorrowRequests = async () => {
      if (!selectedUserId) {
        setBorrowRequests([]);
        setSelectedBookItems(new Map());
        setBookItemsMap(new Map());
        return;
      }

      try {
        setLoadingRequests(true);
        // Fetch only APPROVED borrow requests for the selected user
        const response = await BorrowRequestApi.getAllBorrowRequests({
          userId: selectedUserId,
          status: BorrowRequestStatus.APPROVED,
          limit: 100,
        });

        setBorrowRequests(response.borrowRequests);

        // Fetch book items for each request
        const itemsMap = new Map<number, BookItemWithBook[]>();
        for (const request of response.borrowRequests) {
          for (const item of request.items) {
            try {
              const bookItemsResponse = await BookItemApi.getBookItems({
                bookIds: [item.bookId],
                statuses: ['AVAILABLE'],
                limit: 100,
              });

              const availableItems = (bookItemsResponse.bookItems as BookItemWithBook[]).filter(
                bi => bi.status === 'AVAILABLE'
              );

              // Group by bookId
              const existingItems = itemsMap.get(item.bookId) || [];
              itemsMap.set(item.bookId, [...existingItems, ...availableItems]);
            } catch (error) {
              console.error(`Failed to fetch book items for book ${item.bookId}:`, error);
            }
          }
        }
        setBookItemsMap(itemsMap);
      } catch (error) {
        console.error('Failed to fetch borrow requests:', error);
        toaster.create({
          title: 'Error',
          description: 'Failed to fetch borrow requests',
          type: 'error',
        });
      } finally {
        setLoadingRequests(false);
      }
    };

    fetchBorrowRequests();
  }, [selectedUserId]);

  // Handle user selection
  const handleUserChange = useCallback((value: SelectOption | SelectOption[]) => {
    const selected = Array.isArray(value) ? value[0] : value;
    setSelectedUserId(selected ? Number(selected.value) : null);
    setSelectedBookItems(new Map());
  }, []);

  // Handle book item selection for a specific request item
  const handleBookItemSelection = useCallback(
    (requestId: number, bookId: number, bookItemId: number, bookTitle: string) => {
      setSelectedBookItems(prev => {
        const newMap = new Map(prev);
        const key = `${requestId}-${bookId}`;
        const currentItems = newMap.get(key) || [];

        // Toggle selection
        const existingIndex = currentItems.findIndex(item => item.bookItemId === bookItemId);
        if (existingIndex >= 0) {
          // Remove if already selected
          currentItems.splice(existingIndex, 1);
        } else {
          // Add if not selected
          currentItems.push({
            bookItemId,
            bookId,
            requestId,
            bookTitle,
          });
        }

        if (currentItems.length === 0) {
          newMap.delete(key);
        } else {
          newMap.set(key, currentItems);
        }

        return newMap;
      });
    },
    []
  );

  // Check if book item is selected
  const isBookItemSelected = useCallback(
    (requestId: number, bookId: number, bookItemId: number): boolean => {
      const key = `${requestId}-${bookId}`;
      const items = selectedBookItems.get(key) || [];
      return items.some(item => item.bookItemId === bookItemId);
    },
    [selectedBookItems]
  );

  // Get quantity selected for a request item
  const getQuantitySelected = useCallback(
    (requestId: number, bookId: number): number => {
      const key = `${requestId}-${bookId}`;
      const items = selectedBookItems.get(key) || [];
      return items.length;
    },
    [selectedBookItems]
  );

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!selectedUserId) {
        toaster.create({
          title: 'Error',
          description: 'Please select a user',
          type: 'error',
        });
        return;
      }

      if (selectedBookItems.size === 0) {
        toaster.create({
          title: 'Error',
          description: 'Please select at least one book item',
          type: 'error',
        });
        return;
      }

      // Collect all selected book item IDs and request IDs for confirmation message
      const allBookItemIds: number[] = [];
      const requestIdsSet = new Set<number>();

      selectedBookItems.forEach(items => {
        items.forEach(item => {
          allBookItemIds.push(item.bookItemId);
          requestIdsSet.add(item.requestId);
        });
      });

      // Open confirmation dialog
      openDialog({
        title: 'Confirm Create Borrow Record',
        message: `Do you want to create a borrow record with ${allBookItemIds.length} book item(s)?`,
        confirmText: 'Create Borrow Record',
        cancelText: 'Cancel',
        onConfirm: async () => {
          // borrowDate: current date (date when creating borrow record)
          // returnDate: latest endDate among all related requests, or default 30 days
          const relatedRequests = borrowRequests.filter(r => requestIdsSet.has(r.id));

          // borrowDate is always the current date (date of creating the record)
          const borrowDate = new Date();

          let returnDate: Date;

          if (relatedRequests.length > 0) {
            // Find latest endDate (returnDate) from all related requests
            returnDate = new Date(
              Math.max(...relatedRequests.map(r => new Date(r.endDate).getTime()))
            );
          } else {
            // Fallback if no requests found: default 30 days from now
            returnDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          }

          setIsSubmitting(true);
          try {
            // Call API to create borrow record
            const response = await BorrowRecordApi.createBorrowRecord({
              userId: selectedUserId,
              borrowDate: borrowDate.toISOString(),
              returnDate: returnDate.toISOString(),
              bookItemIds: allBookItemIds,
              requestIds: Array.from(requestIdsSet),
            });

            toaster.create({
              title: 'Success',
              description: response.message || 'Borrow record created successfully',
              type: 'success',
            });

            // Navigate back to borrow records list
            router.push(ROUTES.DASHBOARD.BORROW_RECORDS || '/dashboard/borrow-records');
          } catch (error) {
            console.error('Failed to create borrow record:', error);
            toaster.create({
              title: 'Error',
              description:
                error instanceof Error ? error.message : 'Failed to create borrow record',
              type: 'error',
            });
          } finally {
            setIsSubmitting(false);
          }
        },
      });
    },
    [selectedUserId, selectedBookItems, borrowRequests, router, openDialog]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return {
    // State
    selectedUserId,
    borrowRequests,
    loadingRequests,
    selectedBookItems,
    isSubmitting,
    bookItemsMap,
    userOptions,

    // Handlers
    handleUserChange,
    handleBookItemSelection,
    isBookItemSelected,
    getQuantitySelected,
    handleSubmit,
    handleCancel,

    // Dialog
    dialog,
    handleConfirm,
    handleDialogCancel,
  };
}
