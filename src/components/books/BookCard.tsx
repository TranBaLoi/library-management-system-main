'use client';

import { Button } from '@/components/buttons';
import { ROUTES } from '@/constants';
import { useBookAvailableCount } from '@/lib/hooks/useBooks';
import { Box, Button as ChakraButton, Image, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FaCircleCheck, FaCircleXmark } from 'react-icons/fa6';
import { LuHeart } from 'react-icons/lu';

interface BookCardProps {
  book: {
    id: string;
    title: string;
    isbn: string;
    author: string;
    year: number;
    edition?: string;
    rating: number;
    categories: string[];
    coverImage: string;
    availability: {
      eBook: boolean;
      audioBook: boolean;
    };
    isFavorite: boolean;
  };
  onToggleFavorite?: (bookId: string) => void;
}

function AvailabilityItem({ isAvailable, label }: { isAvailable: boolean; label: string }) {
  return (
    <Box display="flex" alignItems="center" gap="2">
      {isAvailable ? (
        <FaCircleCheck color="green" size="16" />
      ) : (
        <FaCircleXmark color="gray" size="16" />
      )}
      <Text fontSize="sm">{label}</Text>
    </Box>
  );
}

export const BookCard = ({ book, onToggleFavorite }: BookCardProps) => {
  const router = useRouter();
  const bookId = parseInt(book.id, 10);
  const { data: availableCountData } = useBookAvailableCount(isNaN(bookId) ? undefined : bookId);

  // Check availability based on actual available count
  const hardCopyAvailable = (availableCountData?.availableCount ?? 0) > 0;

  const handlePreviewClick = () => {
    router.push(`${ROUTES.BOOK_DETAIL.replace(':id', book.id)}`);
  };

  const handleFavoriteClick = () => {
    if (onToggleFavorite) {
      onToggleFavorite(book.id);
    }
  };

  return (
    <Box
      display="flex"
      flexDirection="row"
      overflow="hidden"
      maxW="full"
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      gap={4}
    >
      {/* Book Cover */}
      <Box flexShrink={0}>
        <Image
          src={book.coverImage}
          alt={book.title}
          height="100px"
          aspectRatio="3/4"
          objectFit="cover"
          borderRadius="md"
        />
      </Box>

      {/* Main Content */}
      <Box display="flex" justifyContent="space-between" alignItems="center" flex="1">
        {/* Left Section - Book Info */}
        <Box width="35%" display="flex" flexDirection="column" gap={2}>
          {/* Title */}
          <Text fontSize="lg" fontWeight="bold">
            {book.title}
          </Text>

          {/* Author & Year */}
          <Text fontSize="sm">
            {book.author}, {book.year}
          </Text>

          {/* ISBN */}
          <Text fontSize="sm" color="secondaryText.500">
            ISBN: {book.isbn}
          </Text>
        </Box>

        {/* Rating */}
        <Box width="15%" display="flex" flexDirection="column" justifyContent="center" gap="2">
          <Text fontSize="sm" fontWeight="semibold">
            Rating
          </Text>
          <Box display="flex" gap={1} alignItems="center">
            <Text fontSize="lg" fontWeight="semibold">
              {book.rating.toFixed(1)}
            </Text>
            <Text fontSize="sm" color="secondaryText.500">
              /5
            </Text>
          </Box>
        </Box>

        {/* Categories */}
        <Box width="25%" display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Categories
          </Text>
          <VStack align="start" gap="1">
            {book.categories.map((category, index) => (
              <Text key={index} fontSize="sm" color="secondaryText.500">
                {category}
              </Text>
            ))}
          </VStack>
        </Box>

        {/* Center Section - Availability */}
        <Box width="15%" display="flex" flexDirection="column" gap={2}>
          <Text fontSize="sm" fontWeight="semibold">
            Availability
          </Text>
          {/* Format Availability */}
          <VStack align="start" gap="2">
            <AvailabilityItem isAvailable={hardCopyAvailable} label="Hard Copy" />
            <AvailabilityItem isAvailable={book.availability.eBook} label="E-Book" />
            <AvailabilityItem isAvailable={book.availability.audioBook} label="Audio Book" />
          </VStack>
        </Box>

        <Box width="200px" display="flex" justifyContent="center">
          {/* Favorite Button */}
          <ChakraButton
            variant="ghost"
            size="md"
            p="2"
            color={book.isFavorite ? 'red.500' : 'gray.400'}
            _hover={{ bg: 'gray.100' }}
            onClick={handleFavoriteClick}
            disabled={!onToggleFavorite}
          >
            <LuHeart size="20" fill={book.isFavorite ? 'currentColor' : 'none'} />
          </ChakraButton>
        </Box>

        <Box width="200px" display="flex" justifyContent="center">
          {/* Preview Button */}
          <Button
            label="Preview"
            variantType="primaryOutline"
            height="40px"
            onClick={handlePreviewClick}
          />
        </Box>
      </Box>
    </Box>
  );
};
