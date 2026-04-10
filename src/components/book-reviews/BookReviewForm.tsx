'use client';

import { FormTextarea, StarRating } from '@/components';
import { Box, Text, VStack } from '@chakra-ui/react';

interface BookReviewFormProps {
  rating: number;
  reviewText: string;
  onRatingChange: (rating: number) => void;
  onReviewTextChange: (text: string) => void;
  ratingError?: string;
  reviewTextError?: string;
}

export function BookReviewForm({
  rating,
  reviewText,
  onRatingChange,
  onReviewTextChange,
  ratingError,
  reviewTextError,
}: BookReviewFormProps) {
  return (
    <VStack gap={8} align="stretch">
      <Box>
        <Text fontSize="md" fontWeight="medium" mb={3}>
          Rating
        </Text>
        <StarRating rating={rating} onRatingChange={onRatingChange} interactive={true} size="lg" />
        {ratingError && (
          <Text fontSize="sm" color="red.500" mt={1}>
            {ratingError}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="medium" mb={3}>
          Review text
        </Text>
        <FormTextarea
          value={reviewText}
          onChange={e => onReviewTextChange(e.target.value)}
          placeholder="Share your thoughts about this book..."
          rows={4}
          resize="vertical"
        />
        {reviewTextError && (
          <Text fontSize="sm" color="red.500" mt={1}>
            {reviewTextError}
          </Text>
        )}
      </Box>
    </VStack>
  );
}
