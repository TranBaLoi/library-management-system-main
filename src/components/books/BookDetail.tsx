'use client';

import {
  Avatar,
  BookEditionsTable,
  BookItemDetailColumns,
  BookItemsTable,
  BookReview,
  BorrowRequestForm,
  Button,
  Dialog,
  ExternalLibrarySearchDialog,
  IconButton,
  Table,
  Tag,
} from '@/components';
import { ROUTES } from '@/constants';
import { getLanguageName } from '@/constants/book';
import {
  useBookAvailableCount,
  useBookBorrowHistory,
  useBookNeighbors,
  useBorrowRequestForm,
  useLatestBooks,
  useMe,
  useReviewStats,
} from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { BookDetail as BookDetailType, BookWithAuthor } from '@/types';
import { BorrowRecordWithDetails } from '@/types/borrow-record';
import { Badge, Box, Flex, Grid, Heading, HStack, Image, Text, VStack } from '@chakra-ui/react';
import { useState } from 'react';
import { LuBookCheck, LuHeart, LuHeartOff, LuPencil } from 'react-icons/lu';
import { MdGroups } from 'react-icons/md';

// Helper function to calculate overdue days
const calculateOverdueDays = (
  returnDate: Date | null,
  actualReturnDate: Date | null
): number | null => {
  if (!returnDate) return null;

  const returnDateObj = typeof returnDate === 'string' ? new Date(returnDate) : returnDate;

  // If already returned, compare actual return date with due date
  // If not returned yet, compare current date with due date
  const compareDate = actualReturnDate
    ? typeof actualReturnDate === 'string'
      ? new Date(actualReturnDate)
      : actualReturnDate
    : new Date();

  const diffTime = compareDate.getTime() - returnDateObj.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Only return positive days (overdue)
  return diffDays > 0 ? diffDays : null;
};

const borrowingHistoryColumns = [
  {
    key: 'memberInfo',
    header: 'Member Info',
    render: (item: BorrowRecordWithDetails) => (
      <HStack gap={3}>
        <Avatar size="sm" src={item.user?.avatarUrl || undefined} />
        <VStack align="start" gap={0}>
          <Text fontWeight="medium">{item.user?.fullName || 'Unknown'}</Text>
          <Text fontSize="sm" color="secondaryText.500">
            {item.user?.email || 'N/A'}
          </Text>
        </VStack>
      </HStack>
    ),
  },
  {
    key: 'borrowDate',
    header: 'Borrow Date',
    render: (item: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(item.borrowDate)}</Text>
    ),
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    render: (item: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(item.returnDate)}</Text>
    ),
  },
  {
    key: 'returnDate',
    header: 'Return Date',
    render: (item: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(item.actualReturnDate)}</Text>
    ),
  },
  {
    key: 'overdue',
    header: 'Overdue',
    render: (item: BorrowRecordWithDetails) => {
      const overdueDays = calculateOverdueDays(item.returnDate, item.actualReturnDate);
      return overdueDays ? (
        <Badge colorScheme="red" variant="subtle">
          {overdueDays} {overdueDays === 1 ? 'Day' : 'Days'}
        </Badge>
      ) : (
        <Text fontSize="sm" color="secondaryText.500">
          —
        </Text>
      );
    },
  },
];

// Reusable components for book details
const MetadataRow = ({ label, value }: { label: string; value: string | number }) => (
  <HStack align="start">
    <Text fontSize="sm" color="secondaryText.500" width="120px">
      {label}
    </Text>
    <Text fontSize="sm" fontWeight="medium">
      {value}
    </Text>
  </HStack>
);

const StatCard = ({ label, value }: { label: string; value: string | React.ReactNode }) => (
  <VStack align="start" gap={1}>
    <Text fontSize="sm" color="secondaryText.500">
      {label}
    </Text>
    {typeof value === 'string' ? (
      <Text fontSize="sm" fontWeight="medium">
        {value}
      </Text>
    ) : (
      <Box>{value}</Box>
    )}
  </VStack>
);

import { BorrowType } from '@/components/borrow-requests/BorrowRequestForm';

interface BookDetailProps {
  book: BookDetailType;
  onEditClick?: () => void;
  onAddBookCopyClick?: () => void;
  onBorrowClick?: () => void;
  onCreateBorrowRequest?: (data: {
    userId: number;
    bookId: number;
    startDate: string;
    endDate: string;
    borrowType: BorrowType;
  }) => Promise<void>;
  onAddToFavoriteClick?: () => void;
  onRemoveFromFavoriteClick?: () => void;
  isFavorite?: boolean;
  hasEbook?: boolean;
}

export function BookDetail({
  book,
  onEditClick,
  onAddBookCopyClick,
  onBorrowClick,
  onCreateBorrowRequest,
  onAddToFavoriteClick,
  onRemoveFromFavoriteClick,
  isFavorite = false,
  hasEbook = false,
}: BookDetailProps) {
  // Get current user info
  const { data: user } = useMe();

  // Get review stats for the book
  const { data: reviewStats } = useReviewStats(book.id);

  // Fetch latest books from Gorse API
  const { data: latestBooksData, isLoading: latestBooksLoading } = useLatestBooks(5, 0);

  // Fetch similar/neighbor books from Gorse API
  const { data: similarBooksData, isLoading: similarBooksLoading } = useBookNeighbors(
    book.id,
    5,
    0
  );

  // Get available book count
  const { data: availableCountData } = useBookAvailableCount(book.id);

  // Borrow request form hook
  const {
    form: borrowForm,
    errors: borrowErrors,
    setField: setBorrowField,
    dialog: borrowDialog,
    closeDialog: closeBorrowDialog,
    openBorrowDialog,
  } = useBorrowRequestForm({
    bookId: book.id,
    user: user ? { id: user.id, fullName: user.fullName } : null,
    hasEbook,
    availableCount: availableCountData?.availableCount ?? 0,
    onBorrowFromPartner: () => setShowExternalSearch(true),
    onCreateBorrowRequest,
  });

  // Determine what to show based on user role
  const isAdminOrLibrarian = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';
  const isReader = user?.role === 'READER' || !user;

  // Fetch borrowing history for the book
  const { data: borrowingHistoryData, isLoading: borrowingHistoryLoading } = useBookBorrowHistory(
    book.id,
    isAdminOrLibrarian
  );

  // Get book item columns for detail view
  const bookItemColumns = BookItemDetailColumns();

  // State for external library search dialog
  const [showExternalSearch, setShowExternalSearch] = useState(false);

  // Check if Borrow Now button is disabled
  const isBorrowNowDisabled = (): boolean => {
    return (availableCountData?.availableCount ?? 0) === 0 && !hasEbook;
  };

  const bookStats = [
    {
      label: 'Rating',
      value:
        reviewStats?.totalReviews && reviewStats.totalReviews > 0
          ? `${reviewStats.averageRating.toFixed(1)} / 5`
          : 'No ratings yet',
    },
    { label: 'Total Pages', value: book?.pageCount ? `${book.pageCount} pages` : 'N/A' },
    {
      label: 'Price',
      value: book?.price ? `${book.price.toLocaleString('vi-VN')} VND` : 'N/A',
    },
    { label: 'Language', value: getLanguageName(book?.language) },
    {
      label: 'Book Copies',
      value:
        availableCountData?.availableCount !== undefined
          ? `${availableCountData.availableCount} available`
          : 'Loading...',
    },
    {
      label: 'E-book',
      value: hasEbook ? (
        <Tag variantType="active">Available</Tag>
      ) : (
        <Tag variantType="inactive">Unavailable</Tag>
      ),
    },
  ];

  const bookMetadata = [
    { label: 'Book ID', value: book?.id || 'N/A' },
    { label: 'ISBN', value: book?.isbn || 'N/A' },
    { label: 'Publisher', value: book?.publisher || 'N/A' },
    { label: 'Publish Year', value: book?.publishYear || 'N/A' },
    { label: 'Edition', value: book?.edition || 'N/A' },
    {
      label: 'Categories',
      value:
        book?.categories && book.categories.length > 0
          ? book.categories.join(', ')
          : 'N/A',
    },
  ];

  return (
    <VStack gap={6} p={4} align="stretch">
      {/* Book Image and Details */}
      <HStack align="stretch" gap={8}>
        <Box flex="5">
          <Grid templateColumns={{ base: '1fr', lg: '2fr 3fr' }} gap={8} mb={6}>
            {/* Book Cover */}
            <Box width="100%" position="relative">
              <Image
                src={book.coverImageUrl ?? ''}
                alt={book.title}
                width="100%"
                objectFit="contain"
                borderRadius="lg"
                bg="gray.100"
                boxShadow="md"
                minHeight="400px"
              />
            </Box>

            {/* Book Details */}
            <VStack align="start" gap={2}>
              <Box
                textAlign="right"
                w="full"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                gap={2}
              >
                {isAdminOrLibrarian && (
                  <Tag variantType={book.isDeleted ? 'inactive' : 'active'}>
                    {book.isDeleted ? 'Inactive' : 'Active'}
                  </Tag>
                )}
                {isReader &&
                  !book.isDeleted &&
                  (isFavorite ? onRemoveFromFavoriteClick : onAddToFavoriteClick) && (
                    <Button
                      label={isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
                      variantType="primaryOutline"
                      onClick={isFavorite ? onRemoveFromFavoriteClick : onAddToFavoriteClick}
                      height="40px"
                      fontSize="sm"
                      p={2}
                      icon={isFavorite ? LuHeartOff : LuHeart}
                    />
                  )}
                {isAdminOrLibrarian && onEditClick && (
                  <IconButton aria-label="Edit book" onClick={onEditClick}>
                    <LuPencil />
                  </IconButton>
                )}
                {isReader &&
                  (onBorrowClick || onCreateBorrowRequest) &&
                  !book.isDeleted &&
                  !isBorrowNowDisabled() && (
                    <Button
                      label="Borrow Now"
                      variantType="primary"
                      onClick={onCreateBorrowRequest ? openBorrowDialog : onBorrowClick}
                      height="40px"
                      fontSize="sm"
                      p={2}
                      icon={LuBookCheck}
                    />
                  )}
                {isReader &&
                  (onBorrowClick || onCreateBorrowRequest) &&
                  !book.isDeleted &&
                  isBorrowNowDisabled() && (
                    <Button
                      label="Borrow from Partner Libraries"
                      variantType="secondary"
                      icon={MdGroups}
                      onClick={() => setShowExternalSearch(true)}
                      height="40px"
                      fontSize="sm"
                      p={2}
                    />
                  )}
              </Box>

              {/* Title and Author */}
              <VStack align="start" gap={1}>
                <Text fontWeight="semibold" fontSize="30px">
                  {book.title}
                </Text>
                <Text fontSize="lg" color="secondaryText.500">
                  by {book.author?.fullName || 'Unknown Author'}
                </Text>
              </VStack>

              {/* Stats Grid */}
              <Grid
                templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }}
                gap={4}
                width="100%"
                borderBottom="1px solid"
                borderColor="gray.200"
                py={4}
              >
                {bookStats.map(stat => (
                  <StatCard key={stat.label} label={stat.label} value={stat.value} />
                ))}
              </Grid>

              {/* Metadata */}
              <VStack align="start" gap={3} width="100%">
                {bookMetadata.map(meta => (
                  <MetadataRow key={meta.label} label={meta.label} value={meta.value} />
                ))}
              </VStack>

              {/* Description */}
              {book.description && (
                <Box>
                  <Text fontSize="sm" fontWeight="medium" mb={2}>
                    Description
                  </Text>
                  <Text
                    fontSize="sm"
                    color="secondaryText.500"
                    lineHeight="1.6"
                    textAlign="justify"
                  >
                    {book.description}
                  </Text>
                </Box>
              )}
            </VStack>
          </Grid>

          {/* Book Copies */}
          {isAdminOrLibrarian && (
            <Box borderRadius="lg" border="1px solid #e5e7eb !important" mt={10} p={6}>
              <BookItemsTable
                columns={bookItemColumns}
                bookIds={[book.id]}
                searchPlaceholder="Search book copies by code"
                showFilter={false}
                showAddButton={!book.isDeleted && !!onAddBookCopyClick}
                addButtonHref={
                  onAddBookCopyClick
                    ? `${ROUTES.DASHBOARD.BOOKS_COPIES_ADD}?bookId=${book.id}`
                    : ROUTES.DASHBOARD.BOOKS_COPIES_ADD
                }
                addButtonLabel="Add Book Copy"
                searchByCodeOnly={true}
                showHeader={true}
                headerTitle="Book Copies"
                maxHeight="400px"
              />
            </Box>
          )}

          {/* Book Editions */}
          {isAdminOrLibrarian && (
            <Box borderRadius="lg" border="1px solid #e5e7eb !important" mt={6} p={6}>
              <BookEditionsTable
                bookId={book.id}
                searchPlaceholder="Search by ISBN, ID, or status..."
                showFilter={false}
                showAddButton={!book.isDeleted}
                addButtonHref={`${ROUTES.DASHBOARD.BOOKS_EDITIONS_ADD}?bookId=${book.id}`}
                addButtonLabel="Add Edition"
                showHeader={true}
                headerTitle="Book Editions"
                maxHeight="400px"
                showBookName={false}
                showId={false}
              />
            </Box>
          )}

          {/* Borrowing History */}
          {isAdminOrLibrarian && (
            <Box borderRadius="lg" border="1px solid #e5e7eb !important" mt={6}>
              <Flex
                justify="space-between"
                align="center"
                p={6}
                borderBottom="1px"
                borderColor="gray.200"
              >
                <Heading size="md" fontWeight="semibold">
                  Borrowing History
                </Heading>
              </Flex>
              <Box p={6}>
                {borrowingHistoryLoading ? (
                  <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                    Loading borrowing history...
                  </Text>
                ) : borrowingHistoryData && borrowingHistoryData.length > 0 ? (
                  <Table
                    columns={borrowingHistoryColumns}
                    data={borrowingHistoryData}
                    page={1}
                    pageSize={10}
                    total={borrowingHistoryData.length}
                  />
                ) : (
                  <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                    No borrowing history available
                  </Text>
                )}
              </Box>
            </Box>
          )}

          {/* Book Reviews */}
          <BookReview bookId={book.id} isReader={isReader} user={user} />

          {/* Borrow Request Dialog */}
          {borrowDialog.isOpen && onCreateBorrowRequest && (
            <Dialog
              isOpen={borrowDialog.isOpen}
              onClose={closeBorrowDialog}
              title={borrowDialog.title || 'Borrow Book'}
              content={
                <BorrowRequestForm
                  startDate={borrowForm.startDate}
                  endDate={borrowForm.endDate}
                  borrowType={borrowForm.borrowType}
                  hasEbook={hasEbook}
                  availableCount={availableCountData?.availableCount ?? 0}
                  onStartDateChange={date => setBorrowField('startDate', date)}
                  onEndDateChange={date => setBorrowField('endDate', date)}
                  onBorrowTypeChange={type => setBorrowField('borrowType', type)}
                  startDateError={borrowErrors.startDate}
                  endDateError={borrowErrors.endDate}
                />
              }
              buttons={[
                {
                  label: borrowDialog.cancelText || 'Cancel',
                  variant: 'secondary',
                  onClick: closeBorrowDialog,
                },
                {
                  label: borrowDialog.confirmText || 'Confirm',
                  variant: 'primary',
                  onClick: borrowDialog.onConfirm || (() => {}),
                },
              ]}
            />
          )}
        </Box>

        {/* Right Column - Analytics and Related Books */}
        <Box flex="2">
          {/* Similar Books */}
          <Box borderRadius="lg" border="1px solid #e5e7eb !important" mb={6}>
            <Flex
              justify="space-between"
              align="center"
              p={6}
              borderBottom="1px"
              borderColor="gray.200"
            >
              <Heading size="md">Similar Books</Heading>
            </Flex>
            <Box p={6}>
              {similarBooksLoading ? (
                <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                  Loading similar books...
                </Text>
              ) : similarBooksData && similarBooksData.length > 0 ? (
                <VStack gap={4}>
                  {similarBooksData.map((similarBook: BookWithAuthor) => (
                    <HStack
                      key={similarBook.id}
                      gap={3}
                      width="100%"
                      cursor="pointer"
                      _hover={{ bg: 'gray.50', borderRadius: 'md' }}
                      p={2}
                      onClick={() => {
                        window.location.href = ROUTES.BOOK_DETAIL.replace(
                          ':id',
                          similarBook.id.toString()
                        );
                      }}
                    >
                      <Image
                        src={similarBook.coverImageUrl || '/api/placeholder/120/180'}
                        alt={similarBook.title}
                        width="60px"
                        height="90px"
                        objectFit="cover"
                        borderRadius="md"
                        bg="gray.100"
                      />
                      <VStack align="start" gap={1} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {similarBook.title}
                        </Text>
                        <Text fontSize="xs" color="secondaryText.500">
                          by {similarBook.author.fullName}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                  No similar books available
                </Text>
              )}
            </Box>
          </Box>

          {/* Latest Books */}
          <Box borderRadius="lg" border="1px solid #e5e7eb !important">
            <Flex
              justify="space-between"
              align="center"
              p={6}
              borderBottom="1px"
              borderColor="gray.200"
            >
              <Heading size="md">Latest Books</Heading>
            </Flex>
            <Box p={6}>
              {latestBooksLoading ? (
                <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                  Loading latest books...
                </Text>
              ) : latestBooksData && latestBooksData.length > 0 ? (
                <VStack gap={4}>
                  {latestBooksData.map(latestBook => (
                    <HStack
                      key={latestBook.id}
                      gap={3}
                      width="100%"
                      cursor="pointer"
                      _hover={{ bg: 'gray.50', borderRadius: 'md' }}
                      p={2}
                      onClick={() => {
                        window.location.href = ROUTES.BOOK_DETAIL.replace(
                          ':id',
                          latestBook.id.toString()
                        );
                      }}
                    >
                      <Image
                        src={latestBook.coverImageUrl || '/api/placeholder/120/180'}
                        alt={latestBook.title}
                        width="60px"
                        height="90px"
                        objectFit="cover"
                        borderRadius="md"
                        bg="gray.100"
                      />
                      <VStack align="start" gap={1} flex={1}>
                        <Text fontSize="sm" fontWeight="medium">
                          {latestBook.title}
                        </Text>
                        <Text fontSize="xs" color="secondaryText.500">
                          by {latestBook.author.fullName}
                        </Text>
                      </VStack>
                    </HStack>
                  ))}
                </VStack>
              ) : (
                <Text fontSize="sm" color="secondaryText.500" textAlign="center" py={4}>
                  No latest books available
                </Text>
              )}
            </Box>
          </Box>
        </Box>
      </HStack>

      {/* External Library Search Dialog */}
      <ExternalLibrarySearchDialog
        isOpen={showExternalSearch}
        onClose={() => setShowExternalSearch(false)}
        bookTitle={book.title}
        authorName={book.author?.fullName}
      />
    </VStack>
  );
}
