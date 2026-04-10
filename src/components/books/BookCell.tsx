'use client';

import { Box, Flex, Image, Text } from '@chakra-ui/react';

export interface BookCellProps {
  title: string;
  coverImageUrl?: string | null;
  authorName: string;
  isbn?: string | null;
  publishYear?: number | null;
}

// Component to display book information in a compact cell format
// Used in tables and dropdowns
export function BookCell({ title, coverImageUrl, authorName, isbn, publishYear }: BookCellProps) {
  return (
    <Flex align="center" gap={3}>
      {/* Cover Image */}
      <Box flexShrink={0}>
        {coverImageUrl ? (
          <Image
            src={coverImageUrl}
            alt={title}
            width="40px"
            height="60px"
            objectFit="cover"
            borderRadius="md"
          />
        ) : (
          <Box
            width="40px"
            height="60px"
            bg="layoutBg.500"
            borderRadius="md"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text fontSize="sm" color="secondaryText.500">
              No Image
            </Text>
          </Box>
        )}
      </Box>

      {/* Book Info */}
      <Box flex={1} minWidth={0}>
        <Text fontWeight="medium" fontSize="sm" truncate>
          {title}
        </Text>
        <Text fontSize="sm" color="secondaryText.500" truncate>
          {authorName}
          {publishYear ? `, (${publishYear})` : ''}
        </Text>
        {isbn && (
          <Text fontSize="sm" color="secondaryText.500">
            ISBN: {isbn}
          </Text>
        )}
      </Box>
    </Flex>
  );
}
