'use client';

import { BookApi, EbookBorrowRequestApi, FavoriteBookApi } from '@/api';
import { BookDetail, BorrowType, toaster } from '@/components';
import { useCreateBorrowRequest } from '@/lib/hooks';
import { BookDetail as BookDetailType } from '@/types';
import { Box } from '@chakra-ui/react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function PublicBookPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = Number(params.id);
  const [book, setBook] = useState<BookDetailType | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [hasEbook, setHasEbook] = useState(false);
  const createBorrowRequestMutation = useCreateBorrowRequest();
  const queryClient = useQueryClient();

  // Fetch book data and check for ebook
  useEffect(() => {
    const fetchBook = async () => {
      if (!bookId || bookId <= 0) {
        router.push('/');
        return;
      }

      try {
        const bookData = await BookApi.getBookById(bookId);
        setBook(bookData);

        // Check if book has ebook
        setHasEbook((bookData.bookEbookCount ?? 0) > 0);
      } catch (err) {
        console.error('Error fetching book:', err);
        toaster.create({
          title: 'Error',
          description: 'Book not found',
          type: 'error',
        });
        router.push('/');
      }
    };

    fetchBook();
  }, [bookId, router]);

  // Fetch favorite status
  useEffect(() => {
    const checkFavorite = async () => {
      try {
        const isFav = await FavoriteBookApi.checkFavoriteBook(bookId);
        setIsFavorite(isFav);
      } catch (error) {
        console.error('Error checking favorite:', error);
        setIsFavorite(false);
      }
    };

    if (bookId) {
      checkFavorite();
    }
  }, [bookId]);

  const handleAddToFavorite = async () => {
    try {
      await FavoriteBookApi.createFavoriteBook({ bookId });

      setIsFavorite(true);
      toaster.create({
        title: 'Success',
        description: 'Book added to favorites',
        type: 'success',
      });
    } catch (err) {
      console.error('Error adding favorite:', err);
      toaster.create({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to add book to favorites',
        type: 'error',
      });
    }
  };

  const handleRemoveFromFavorite = async () => {
    try {
      await FavoriteBookApi.deleteFavoriteBook({ bookId });

      setIsFavorite(false);
      toaster.create({
        title: 'Success',
        description: 'Book removed from favorites',
        type: 'success',
      });
    } catch (err) {
      console.error('Error removing favorite:', err);
      toaster.create({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to remove book from favorites',
        type: 'error',
      });
    }
  };

  if (!book) {
    return null;
  }

  const handleCreateBorrowRequest = async (data: {
    userId: number;
    bookId: number;
    startDate: string;
    endDate: string;
    borrowType: BorrowType;
  }) => {
    if (data.borrowType === 'ebook') {
      // Create ebook borrow request
      try {
        const response = await EbookBorrowRequestApi.createEbookBorrowRequest({
          userId: data.userId,
          bookId: data.bookId,
          startDate: data.startDate,
          endDate: data.endDate,
        });
        // Invalidate book available count to refresh the stat
        queryClient.invalidateQueries({ queryKey: ['bookAvailableCount', data.bookId] });
        // Show success toast
        toaster.create({
          title: 'Success!',
          description: response.message || 'Ebook borrowed successfully!',
          type: 'success',
          duration: 5000,
        });
      } catch (error) {
        // Show error toast
        toaster.create({
          title: 'Error!',
          description:
            error instanceof Error ? error.message : 'An error occurred while borrowing the ebook!',
          type: 'error',
          duration: 5000,
        });
        throw error; // Re-throw to let the form handle it
      }
    } else {
      // Create physical book borrow request
      try {
        await createBorrowRequestMutation.mutateAsync({
          userId: data.userId,
          startDate: data.startDate,
          endDate: data.endDate,
          items: [
            {
              bookId: data.bookId,
              quantity: 1,
              startDate: data.startDate,
              endDate: data.endDate,
            },
          ],
        });
        // Invalidate book available count to refresh the stat
        queryClient.invalidateQueries({ queryKey: ['bookAvailableCount', data.bookId] });
      } catch (error) {
        // Error is already handled by the mutation
        throw error;
      }
    }
  };

  return (
    <Box bg="white" rounded="lg" p={4}>
      <BookDetail
        book={book}
        onCreateBorrowRequest={handleCreateBorrowRequest}
        onAddToFavoriteClick={handleAddToFavorite}
        onRemoveFromFavoriteClick={handleRemoveFromFavorite}
        isFavorite={isFavorite}
        hasEbook={hasEbook}
      />
    </Box>
  );
}
