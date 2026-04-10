import { BookApi } from '@/api';
import { Book, BookWithAuthor } from '@/types';
import { useInfiniteQuery, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo } from 'react';
import { useAuthors } from './useAuthors';

export function useBooks(params?: {
  page?: number;
  limit?: number;
  search?: string;
  authorIds?: number[];
  categoryIds?: number[];
  languageCodes?: string[];
  publishYearFrom?: number;
  publishYearTo?: number;
  status?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  isDeleted?: boolean;
  availableAt?: ('book-copy' | 'ebook')[];
}) {
  return useQuery({
    queryKey: ['books', params],
    queryFn: async (): Promise<{ books: BookWithAuthor[]; pagination: { total: number } }> => {
      return BookApi.getBooks(params);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Lightweight book option for dropdown
export interface BookOption {
  value: string;
  label: string;
  title: string;
  coverImageUrl: string | null;
  authorName: string;
  publishYear: number | null;
  isbn: string | null;
}

// Hook to get all books for options
export function useAllBooks() {
  return useQuery({
    queryKey: ['books', 'all'],
    queryFn: async (): Promise<Book[]> => {
      return BookApi.getAllBooks();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// Helper function to convert books to lightweight SelectOption format
export function useBookOptions(): BookOption[] {
  const { data: books } = useAllBooks();
  const { data: authors } = useAuthors();

  return useMemo(() => {
    if (!books || !authors) return [];

    const authorMap = new Map(authors.map(a => [a.id, a]));

    return books.map(book => ({
      value: book.id.toString(),
      label: book.title,
      title: book.title,
      coverImageUrl: book.coverImageUrl,
      authorName: authorMap.get(book.authorId)?.fullName || 'Unknown Author',
      publishYear: book.publishYear,
      isbn: book.isbn,
    }));
  }, [books, authors]);
}

// Hook to get available book count
export function useBookAvailableCount(bookId: number | undefined) {
  return useQuery({
    queryKey: ['bookAvailableCount', bookId],
    queryFn: async (): Promise<{ availableCount: number }> => {
      if (!bookId) throw new Error('Book ID is required');
      return BookApi.getBookAvailableCount(bookId);
    },
    enabled: !!bookId,
    staleTime: 1 * 60 * 1000,
  });
}

// Hook for lazy loading books with search
export function useLazySearchBooks(keyword: string) {
  const queryClient = useQueryClient();

  // Reset queries when keyword changes
  useEffect(() => {
    queryClient.removeQueries({ queryKey: ['books', 'search'] });
  }, [keyword, queryClient]);

  return useInfiniteQuery({
    queryKey: ['books', 'search', keyword],
    queryFn: ({ pageParam = 0 }) =>
      BookApi.searchBooks({ keyword, page: pageParam, size: 20 }),
    getNextPageParam: (lastPage, pages) => (lastPage.hasNext ? pages.length : undefined),
    enabled: keyword.length >= 2 || keyword.length === 0,
    initialPageParam: 0,
  });
}

// Hook to get book by ID
export function useBookById(bookId: number | string | undefined) {
  return useQuery({
    queryKey: ['book', bookId],
    queryFn: async () => {
      if (!bookId) throw new Error('Book ID is required');
      return BookApi.getBookById(Number(bookId));
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}