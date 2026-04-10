'use client';

import { Button, Dialog, FormSelect, PaginationControls, Spinner, StarRating } from '@/components';
import {
  useBookReviews,
  useCreateReview,
  useDeleteReview,
  useReviewForm,
  useReviewStats,
  useUpdateReview,
} from '@/lib/hooks';
import { ReviewDisplayData, ReviewStats } from '@/types';
import { Box, Flex, Heading, HStack, Text, VStack } from '@chakra-ui/react';
import { useCallback, useMemo, useState } from 'react';
import { FaStar } from 'react-icons/fa';
import { LuStar } from 'react-icons/lu';
import { BookReviewCard } from './BookReviewCard';
import { BookReviewForm } from './BookReviewForm';

interface BookReviewProps {
  bookId: number;
  isReader: boolean;
  user?: {
    id: number;
    fullName: string;
  } | null;
}

export function BookReview({ bookId, isReader, user }: BookReviewProps) {
  const [filterRating, setFilterRating] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'highest-rating' | 'lowest-rating'>(
    'newest'
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(5);
  // Reset page when filter changes
  const handleFilterChange = (rating: number | null) => {
    setFilterRating(rating);
    setCurrentPage(1);
  };

  const handleSortChange = (sort: 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating') => {
    setSortBy(sort);
    setCurrentPage(1);
  };

  // Fetch reviews and stats from API
  const queryParams = {
    page: currentPage,
    limit: pageSize,
    rating: filterRating !== null ? filterRating : undefined,
    sortBy: sortBy === 'newest' || sortBy === 'oldest' ? 'createdAt' : 'rating',
    sortOrder: (() => {
      switch (sortBy) {
        case 'newest':
          return 'desc' as const;
        case 'oldest':
          return 'asc' as const;
        case 'highest-rating':
          return 'desc' as const;
        case 'lowest-rating':
          return 'asc' as const;
        default:
          return 'desc' as const;
      }
    })(),
  };

  const { data: reviewsData, isLoading: reviewsLoading } = useBookReviews(bookId, queryParams);
  const { data: reviewStats, isLoading: statsLoading } = useReviewStats(bookId);
  const createReviewMutation = useCreateReview();
  const updateReviewMutation = useUpdateReview();
  const deleteReviewMutation = useDeleteReview();

  // Convert API data to display format
  const reviews: ReviewDisplayData[] = useMemo(
    () =>
      reviewsData?.reviews.map(review => ({
        id: review.id,
        userId: review.userId,
        userName: review.user.fullName,
        userAvatar: review.user.avatarUrl || '',
        rating: review.rating,
        reviewText: review.reviewText || '',
        reviewDate: review.reviewDate
          ? new Date(review.reviewDate).toISOString().split('T')[0]
          : new Date(review.createdAt).toISOString().split('T')[0],
        createdAt: new Date(review.createdAt).toISOString(),
      })) || [],
    [reviewsData]
  );

  const stats: ReviewStats = reviewStats || {
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: [
      { rating: 5, count: 0, percentage: 0 },
      { rating: 4, count: 0, percentage: 0 },
      { rating: 3, count: 0, percentage: 0 },
      { rating: 2, count: 0, percentage: 0 },
      { rating: 1, count: 0, percentage: 0 },
    ],
  };

  // Create stable callback functions
  const handleCreateReview = useCallback(
    async (data: {
      userId: number;
      bookId: number;
      rating: number;
      reviewText: string | null;
      reviewDate: Date;
    }) => {
      await createReviewMutation.mutateAsync(data);
    },
    [createReviewMutation]
  );

  const handleUpdateReview = useCallback(
    async (id: number, data: { rating: number; reviewText: string | null; reviewDate: Date }) => {
      try {
        await updateReviewMutation.mutateAsync({ id, data });
      } catch (error) {
        throw error;
      }
    },
    [updateReviewMutation]
  );

  const handleDeleteReview = useCallback(
    async (id: number) => {
      await deleteReviewMutation.mutateAsync(id);
    },
    [deleteReviewMutation]
  );

  // Use review form hook with API callbacks
  const {
    form,
    errors,
    setField,
    dialog,
    closeDialog,
    openReviewDialog,
    openEditDialog,
    openDeleteDialog,
    editingReview,
  } = useReviewForm({
    bookId,
    user,
    onCreateReview: handleCreateReview,
    onUpdateReview: handleUpdateReview,
    onDeleteReview: handleDeleteReview,
  });

  const paginatedReviews = reviews;
  const totalReviews = reviewsData?.pagination.total || 0;

  return (
    <Box borderRadius="lg" border="1px solid" borderColor="gray.200" mt={6}>
      <Flex justify="space-between" align="center" p={6} borderBottom="1px" borderColor="gray.200">
        <Heading size="md" fontWeight="semibold">
          Reviews
        </Heading>
        {isReader && (
          <Button
            label="Write a review"
            variantType="primary"
            onClick={openReviewDialog}
            height="40px"
            fontSize="sm"
            p={2}
            icon={LuStar}
          />
        )}
      </Flex>

      <Box px={6} pb={6}>
        {/* Rating Summary */}
        <Box display="flex" justifyContent="space-between" alignItems="center" gap={4} pb={6}>
          <VStack align="start" gap={2} flex={1}>
            <Box
              width="100%"
              display="flex"
              flexDirection="column"
              justifyContent="center"
              alignItems="center"
            >
              {statsLoading ? (
                <Text fontSize="5xl" fontWeight="bold" color="gray.400">
                  ...
                </Text>
              ) : (
                <Text fontSize="5xl" fontWeight="bold">
                  {stats.averageRating}
                </Text>
              )}
              <VStack align="center" gap={1} width="100%">
                <StarRating rating={Math.round(stats.averageRating)} size="lg" />
                <Text fontSize="sm" color="secondaryText.500">
                  {stats.totalReviews} reviews
                </Text>
              </VStack>
            </Box>
          </VStack>

          {/* Rating Distribution */}
          <Box gap={2} flex={2}>
            {stats.ratingDistribution.map(dist => (
              <Box display="flex" alignItems="center" key={dist.rating} gap={3}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Text fontSize="sm">{dist.rating}</Text>
                  <Box color="yellow.400">
                    <FaStar />
                  </Box>
                </Box>
                <Box width="100%" height="8px" bg="gray.200" borderRadius="md" overflow="hidden">
                  <Box
                    width={`${dist.percentage}%`}
                    height="100%"
                    bg="yellow.400"
                    borderRadius="md"
                  />
                </Box>
                <Text fontSize="sm" color="secondaryText.500" width="40px">
                  {dist.count}
                </Text>
              </Box>
            ))}
          </Box>
        </Box>

        {/* Review Filters and Controls */}
        <Flex justify="space-between" align="center" my={6}>
          <HStack gap={4}>
            <Text fontSize="sm" fontWeight="medium">
              Filter by:
            </Text>
            <HStack gap={2}>
              <Button
                height="30px"
                variantType={filterRating === null ? 'primaryOutline' : 'tertiary'}
                onClick={() => handleFilterChange(null)}
                label="All"
                fontSize="sm"
              />
              {[5, 4, 3, 2, 1].map(rating => (
                <Button
                  key={rating}
                  height="30px"
                  variantType={filterRating === rating ? 'primaryOutline' : 'tertiary'}
                  onClick={() => handleFilterChange(rating)}
                  label={`${rating} stars`}
                  fontSize="sm"
                />
              ))}
            </HStack>
          </HStack>

          <HStack gap={2}>
            <Text fontSize="sm">Sort by:</Text>
            <Box width="150px">
              <FormSelect
                items={[
                  { value: 'newest', label: 'Newest' },
                  { value: 'oldest', label: 'Oldest' },
                  { value: 'highest-rating', label: 'Highest Rating' },
                  { value: 'lowest-rating', label: 'Lowest Rating' },
                ]}
                value={sortBy}
                onChange={value =>
                  handleSortChange(
                    value as 'newest' | 'oldest' | 'highest-rating' | 'lowest-rating'
                  )
                }
                fontSize="sm"
                triggerSize="sm"
              />
            </Box>
          </HStack>
        </Flex>

        {/* Reviews List */}
        <VStack gap={4} align="stretch">
          {reviewsLoading ? (
            <Box
              p={4}
              display="flex"
              flexDirection="column"
              alignItems="center"
              justifyContent="center"
              gap={4}
            >
              <Spinner />
              <Text color="secondaryText.500">Loading...</Text>
            </Box>
          ) : paginatedReviews.length > 0 ? (
            paginatedReviews.map(review => (
              <BookReviewCard
                key={review.id}
                review={review}
                currentUserId={user?.id}
                onEdit={openEditDialog}
                onDelete={openDeleteDialog}
              />
            ))
          ) : (
            <Box
              p={8}
              textAlign="center"
              border="1px dashed"
              borderColor="gray.300"
              borderRadius="lg"
              bg="gray.50"
            >
              <Text color="secondaryText.500">
                {filterRating ? `No reviews with ${filterRating} stars` : 'No reviews yet'}
              </Text>
            </Box>
          )}
        </VStack>

        {/* Pagination Controls */}
        {totalReviews > pageSize && (
          <Flex justify="center" mt={6}>
            <PaginationControls
              page={currentPage}
              pageSize={pageSize}
              total={totalReviews}
              onPageChange={setCurrentPage}
            />
          </Flex>
        )}
      </Box>

      {/* Review Form Dialog */}
      {dialog.isOpen && (
        <Dialog
          isOpen={dialog.isOpen}
          onClose={closeDialog}
          title={dialog.title || (editingReview ? 'Edit review' : 'Write a review')}
          content={
            dialog.title?.includes('delete') || dialog.title?.includes('Delete') ? (
              <Text>{dialog.message}</Text>
            ) : (
              // Review form dialog
              <BookReviewForm
                rating={form.rating}
                reviewText={form.reviewText || ''}
                onRatingChange={rating => setField('rating', rating)}
                onReviewTextChange={text => setField('reviewText', text)}
                ratingError={errors.rating}
                reviewTextError={errors.reviewText}
              />
            )
          }
          buttons={[
            {
              label: dialog.cancelText || 'Cancel',
              variant: 'secondary',
              onClick: closeDialog,
            },
            {
              label: dialog.confirmText || (editingReview ? 'Update' : 'Submit'),
              variant: 'primary',
              onClick: dialog.onConfirm || (() => {}),
            },
          ]}
        />
      )}
    </Box>
  );
}
