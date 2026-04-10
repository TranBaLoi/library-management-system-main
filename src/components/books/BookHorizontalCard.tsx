'use client';

import { Box, HStack, Image, Text, VStack } from '@chakra-ui/react';

export interface BookHorizontalCardData {
  id: string;
  title: string;
  author: string;
  year: number;
  rating: number;
  coverImage: string;
}

interface BookHorizontalCardProps {
  book: BookHorizontalCardData;
  onClick?: (bookId: string) => void;
}

export function BookHorizontalCard({ book, onClick }: BookHorizontalCardProps) {
  const handleClick = () => {
    if (onClick) {
      onClick(book.id);
    }
  };

  return (
    <Box
      bg="white"
      p={4}
      rounded="lg"
      minW="180px"
      maxW="180px"
      cursor={onClick ? 'pointer' : 'default'}
      onClick={handleClick}
      _hover={onClick ? { transform: 'translateY(-4px)', transition: 'transform 0.2s' } : {}}
    >
      <VStack align="start" gap={2} w="100%">
        {/* Book Cover */}
        <Box w="100%" aspectRatio="3/4" borderRadius="md" overflow="hidden" bg="gray.100">
          <Image src={book.coverImage} alt={book.title} w="100%" h="100%" objectFit="cover" />
        </Box>

        {/* Book Info */}
        <VStack align="start" gap={1} w="100%">
          <Box
            fontSize="sm"
            fontWeight="medium"
            color="primaryText.500"
            lineHeight="1.3"
            css={{
              display: '-webkit-box',
              WebkitLineClamp: 1,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {book.title}
          </Box>
          <Text
            fontSize="xs"
            color="secondaryText.500"
            w="100%"
            css={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {book.author}, {book.year}
          </Text>
          <HStack gap={0.5} align="center">
            <Text fontSize="xs" fontWeight="semibold" color="primaryText.500">
              {book.rating.toFixed(1)}
            </Text>
            <Text fontSize="xs" color="secondaryText.500">
              /5
            </Text>
          </HStack>
        </VStack>
      </VStack>
    </Box>
  );
}
