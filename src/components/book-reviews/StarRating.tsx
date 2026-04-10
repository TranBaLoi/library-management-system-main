'use client';

import { Box, HStack } from '@chakra-ui/react';
import { FaStar } from 'react-icons/fa';

interface StarRatingProps {
  rating: number;
  onRatingChange?: (rating: number) => void;
  interactive?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function StarRating({
  rating,
  onRatingChange,
  interactive = false,
  size = 'md',
}: StarRatingProps) {
  const starSize = size === 'sm' ? '14px' : size === 'lg' ? '20px' : '16px';

  return (
    <HStack gap={1}>
      {[1, 2, 3, 4, 5].map(star => (
        <Box
          key={star}
          cursor={interactive ? 'pointer' : 'default'}
          onClick={() => interactive && onRatingChange?.(star)}
          color={star <= rating ? 'yellow.400' : 'gray.300'}
          fontSize={starSize}
          transition="color 0.2s"
          _hover={interactive ? { color: star <= rating ? 'yellow.500' : 'yellow.300' } : {}}
        >
          <FaStar />
        </Box>
      ))}
    </HStack>
  );
}
