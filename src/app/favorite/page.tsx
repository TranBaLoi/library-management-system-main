'use client';

import { FavoriteBookApi } from '@/api';
import {
  BookCard,
  Button,
  FormSelect,
  PaginationControls,
  SearchInput,
  toaster,
} from '@/components';
import { ROUTES } from '@/constants';
import { FavoriteBooksListPayload } from '@/types';
import { Box, Spinner, Stack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

const FAVORITE_SORT_OPTIONS = [
  { label: 'Newest Added', value: 'newest' },
  { label: 'Oldest Added', value: 'oldest' },
  { label: 'Title (A-Z)', value: 'title-asc' },
  { label: 'Title (Z-A)', value: 'title-desc' },
  { label: 'Author (A-Z)', value: 'author-asc' },
  { label: 'Author (Z-A)', value: 'author-desc' },
];

export default function FavoritePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [data, setData] = useState<FavoriteBooksListPayload | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isFetchingData, setIsFetchingData] = useState(false);

  const getSortParams = (sortValue: string) => {
    const sortMapping: Record<string, { sortBy: string; sortOrder: 'asc' | 'desc' }> = {
      newest: { sortBy: 'createdAt', sortOrder: 'desc' },
      oldest: { sortBy: 'createdAt', sortOrder: 'asc' },
      'title-asc': { sortBy: 'bookTitle', sortOrder: 'asc' },
      'title-desc': { sortBy: 'bookTitle', sortOrder: 'desc' },
      'author-asc': { sortBy: 'authorName', sortOrder: 'asc' },
      'author-desc': { sortBy: 'authorName', sortOrder: 'desc' },
    };

    return sortMapping[sortValue] || sortMapping['newest'];
  };

  const { sortBy: apiSortBy, sortOrder } = getSortParams(sortBy);

  // Fetch favorite books
  const fetchFavoriteBooks = async (isInitial = false) => {
    try {
      if (isInitial) {
        setIsInitialLoading(true);
      } else {
        setIsFetchingData(true);
      }

      const result = await FavoriteBookApi.getFavoriteBooks({
        search: searchQuery,
        sortBy: apiSortBy,
        sortOrder,
        page,
        limit: pageSize,
      });
      setData(result);
    } catch (err) {
      console.error('Error fetching favorite books:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to fetch favorite books',
        type: 'error',
      });
    } finally {
      if (isInitial) {
        setIsInitialLoading(false);
      } else {
        setIsFetchingData(false);
      }
    }
  };

  useEffect(() => {
    // Only treat first load as initial loading
    const isFirstLoad = data === null;
    fetchFavoriteBooks(isFirstLoad);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery, apiSortBy, sortOrder, page, pageSize]);

  const favoriteBooks = useMemo(() => {
    if (!data?.favoriteBooks) return [];

    return data.favoriteBooks.map(favorite => {
      const ebookCount = favorite.book.bookEditions?.filter(e => e.format === 'EBOOK').length ?? 0;
      const audioCount = favorite.book.bookEditions?.filter(e => e.format === 'AUDIO').length ?? 0;

      return {
        id: favorite.bookId.toString(),
        title: favorite.book.title,
        isbn: favorite.book.isbn || '',
        author: favorite.book.author.fullName,
        year: favorite.book.publishYear || 0,
        edition: favorite.book.edition || undefined,
        rating: favorite.book.averageRating || 0,
        categories: favorite.book.categories && favorite.book.categories.length > 0 ? favorite.book.categories : ['General'],
        coverImage: favorite.book.coverImageUrl || '',
      availability: {
        eBook: ebookCount > 0,
        audioBook: audioCount > 0,
      },
        isFavorite: true,
      };
    });
  }, [data?.favoriteBooks]);

  const totalCount = data?.pagination?.total ?? 0;

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleSortChange = (value: string) => {
    setSortBy(value);
    setPage(1);
  };

  const handleRemoveFavorite = async (bookId: string) => {
    try {
      await FavoriteBookApi.deleteFavoriteBook({ bookId: Number(bookId) });

      toaster.create({
        title: 'Success',
        description: 'Book removed from favorites',
        type: 'success',
      });

      // Refetch the list after successful deletion
      fetchFavoriteBooks();
    } catch (err) {
      console.error('Error deleting favorite:', err);
      toaster.create({
        title: 'Error',
        description: 'Failed to remove book from favorites',
        type: 'error',
      });
    }
  };

  // Show initial loading spinner only on first load
  if (isInitialLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minH="400px">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box mb={6}>
        <Text fontSize="2xl" fontWeight="bold" mb={2}>
          My Favorite Books
        </Text>
        <Text fontSize="sm" color="secondaryText.500">
          Manage your collection of favorite books
        </Text>
      </Box>

      {/* Search and Sort Controls */}
      <Box display="flex" gap={4} justifyContent="space-between" alignItems="center" mb={4}>
        <Box flex="1" maxW="600px">
          <SearchInput
            placeholder="Search in your favorites..."
            value={searchQuery}
            onChange={handleSearchChange}
            bg="white"
            border="1px solid"
            borderColor="gray.200"
          />
        </Box>
        <Box display="flex" alignItems="center">
          <Text fontSize="sm" w="80px">
            Sort by:
          </Text>
          <FormSelect
            items={FAVORITE_SORT_OPTIONS}
            fontSize="sm"
            value={sortBy}
            bg="white"
            onChange={handleSortChange}
            width="180px"
          />
        </Box>
      </Box>

      {/* Results Info */}
      <Box mb={4}>
        <Text fontSize="sm" color="secondaryText.500">
          {searchQuery
            ? `Search results: ${totalCount} books`
            : `Total favorites: ${totalCount} books`}
        </Text>
      </Box>

      {/* Loading overlay for data fetching */}
      {isFetchingData && (
        <Box display="flex" justifyContent="center" alignItems="center" py={8}>
          <Spinner size="lg" />
        </Box>
      )}

      {/* Books List */}
      {!isFetchingData && favoriteBooks.length === 0 ? (
        <Box
          textAlign="center"
          py={12}
          px={6}
          bg="white"
          borderRadius="lg"
          border="1px solid"
          borderColor="gray.200"
        >
          <Text fontSize="lg" fontWeight="semibold" mb={2}>
            No favorite books yet
          </Text>
          <Text fontSize="sm" color="secondaryText.500" mb={4}>
            Start adding books to your favorites to see them here
          </Text>
          <Button
            label="Browse Books"
            variantType="primary"
            onClick={() => router.push(ROUTES.SEARCH)}
            width="200px"
          />
        </Box>
      ) : !isFetchingData ? (
        <>
          <Stack gap={6}>
            {favoriteBooks.map(book => (
              <BookCard key={book.id} book={book} onToggleFavorite={handleRemoveFavorite} />
            ))}
          </Stack>

          {/* Pagination */}
          <Box mt={6} display="flex" justifyContent="center">
            <PaginationControls
              page={page}
              pageSize={pageSize}
              total={totalCount}
              onPageChange={setPage}
            />
          </Box>
        </>
      ) : null}
    </Box>
  );
}
