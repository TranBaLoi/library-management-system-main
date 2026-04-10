'use client';

import { BookSection, type BookHorizontalCardData } from '@/components/books';
import { ROUTES } from '@/constants';
import { useBooks } from '@/lib/hooks/useBooks';
import { useCategories } from '@/lib/hooks/useCategories';
import { useLatestBooks } from '@/lib/hooks/useLatestBooks';
import { useMe } from '@/lib/hooks/useMe';
import { usePopularBooks } from '@/lib/hooks/usePopularBooks';
import { useRecommendations } from '@/lib/hooks/useRecommendations';
import { Category } from '@/types';
import { Box, Container, Spinner, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useMemo } from 'react';

// Target categories to display on homepage
const TARGET_CATEGORY_NAMES = [
  'Fiction',
  'Juvenile Fiction',
  'Literary Criticism',
  'Classic',
  'Literature',
  'Language Arts & Disciplines',
  'Children\'s stories',
];

// Helper function to map BookWithAuthor to BookHorizontalCardData
function mapBookToCardData(book: {
  id: number;
  title: string;
  author: { fullName: string };
  publishYear: number | null;
  coverImageUrl: string | null;
  averageRating?: number;
}): BookHorizontalCardData {
  return {
    id: book.id.toString(),
    title: book.title,
    author: book.author.fullName,
    year: book.publishYear || 0,
    rating: book.averageRating || 0,
    coverImage: book.coverImageUrl || '',
  };
}

// Component to display books by category
function CategoryBookSection({
  category,
  onBookClick,
}: {
  category: Category;
  onBookClick: (bookId: string) => void;
}) {
  const { data, isLoading } = useBooks({
    categoryIds: [category.id],
    limit: 12,
    isDeleted: false,
  });

  const books = useMemo(() => {
    if (!data?.books) return [];
    return data.books.map(mapBookToCardData);
  }, [data]);

  // Display book section
  return (
    <BookSection
      title={category.name}
      showAllLink={`${ROUTES.SEARCH}?category=${encodeURIComponent(category.name.toLowerCase())}`}
      books={isLoading ? [] : books}
      onBookClick={onBookClick}
    />
  );
}

export default function Home() {
  const router = useRouter();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const { data: user } = useMe();
  const isLoggedIn = !!user;

  // Fetch recommendations only if user is logged in
  const { data: recommendedBooksData, isLoading: recommendationsLoading } =
    useRecommendations(isLoggedIn);

  // Fetch latest books
  const { data: latestBooksData, isLoading: latestBooksLoading } = useLatestBooks(10, 0);

  // Fetch popular books (always available, not user-specific)
  const { data: popularBooksData, isLoading: popularBooksLoading } = usePopularBooks(10);

  // Get specific categories: computer, technology, program, science, engineering
  const topCategories = useMemo(() => {
    if (!categories || categories.length === 0) return [];

    // Filter categories by exact name match (case-insensitive)
    const filtered = categories.filter(category =>
      TARGET_CATEGORY_NAMES.some(name => category.name.toLowerCase() === name.toLowerCase())
    );

    // Sort to maintain order: computer, technology, program, science, engineering
    return filtered.sort((a, b) => {
      const aIndex = TARGET_CATEGORY_NAMES.findIndex(
        name => a.name.toLowerCase() === name.toLowerCase()
      );
      const bIndex = TARGET_CATEGORY_NAMES.findIndex(
        name => b.name.toLowerCase() === name.toLowerCase()
      );
      return aIndex - bIndex;
    });
  }, [categories]);

  // Map recommended books to card data
  const recommendedBooks = useMemo(() => {
    if (!recommendedBooksData || recommendedBooksData.length === 0) return [];
    return recommendedBooksData.map(mapBookToCardData);
  }, [recommendedBooksData]);

  // Map latest books to card data
  const latestBooks = useMemo(() => {
    if (!latestBooksData || latestBooksData.length === 0) return [];
    return latestBooksData.map(mapBookToCardData);
  }, [latestBooksData]);

  // Map popular books to card data
  const popularBooks = useMemo(() => {
    if (!popularBooksData || popularBooksData.length === 0) return [];
    return popularBooksData.map(mapBookToCardData);
  }, [popularBooksData]);

  const handleBookClick = (bookId: string) => {
    router.push(ROUTES.BOOK_DETAIL.replace(':id', bookId));
  };

  if (categoriesLoading) {
    return (
      <Box minH="100vh" py={8} display="flex" justifyContent="center" alignItems="center">
        <Spinner size="xl" />
      </Box>
    );
  }

  return (
    <Box minH="100vh" py={8} w="100%">
      <Container px={0} maxW="1550px">
        <VStack align="stretch" gap={8}>
          {/* Latest Books Section */}
          <BookSection
            title="Latest Books"
            showAllLink={ROUTES.SEARCH}
            books={latestBooksLoading ? [] : latestBooks}
            onBookClick={handleBookClick}
          />

          {/* Popular Books Section */}
          <BookSection
            title="Popular Books"
            showAllLink={ROUTES.SEARCH}
            books={popularBooksLoading ? [] : popularBooks}
            onBookClick={handleBookClick}
          />

          {/* Recommended Section */}
          {isLoggedIn && (
            <BookSection
              title="Recommended for You"
              showAllLink={ROUTES.SEARCH}
              books={recommendationsLoading ? [] : recommendedBooks}
              onBookClick={handleBookClick}
            />
          )}

          {/* Category Sections */}
          {topCategories.map(category => (
            <CategoryBookSection
              key={category.id}
              category={category}
              onBookClick={handleBookClick}
            />
          ))}

          {/* Display message if no categories */}
          {topCategories.length === 0 && (
            <Text fontSize="md" color="secondaryText.500" textAlign="center" py={8}>
              No book categories available
            </Text>
          )}
        </VStack>
      </Container>
    </Box>
  );
}
