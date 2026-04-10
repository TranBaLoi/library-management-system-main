'use client';

import { Avatar, Button, StarRating } from '@/components';
import { formatDate } from '@/lib/utils';
import { ReviewDisplayData } from '@/types';
import { Box, HStack, Menu, Portal, Text, VStack } from '@chakra-ui/react';
import { HiDotsVertical } from 'react-icons/hi';
import { MdDelete, MdEdit } from 'react-icons/md';

interface BookReviewCardProps {
  review: ReviewDisplayData;
  currentUserId?: number;
  onEdit?: (review: ReviewDisplayData) => void;
  onDelete?: (review: ReviewDisplayData) => void;
}

export function BookReviewCard({ review, currentUserId, onEdit, onDelete }: BookReviewCardProps) {
  const isCurrentUserReview = currentUserId && review.userId === currentUserId;

  return (
    <Box p={4} border="1px solid" borderColor="gray.200" borderRadius="lg" bg="white">
      <HStack justify="space-between" align="start" mb={3}>
        <HStack gap={3}>
          <Avatar size="sm" src={review.userAvatar} />
          <VStack align="start" gap={0}>
            <Text fontWeight="medium" fontSize="sm">
              {review.userName}
            </Text>
            <HStack gap={2}>
              <StarRating rating={review.rating} size="sm" />
              <Text fontSize="xs" color="secondaryText.500">
                {formatDate(review.reviewDate)}
              </Text>
            </HStack>
          </VStack>
        </HStack>

        {/* Action menu for current user's review */}
        {isCurrentUserReview && (
          <Menu.Root>
            <Menu.Trigger asChild>
              <Button
                variantType="ghost"
                height="36px"
                width="36px"
                borderColor="transparent"
                icon={HiDotsVertical}
                aria-label="Review actions"
              />
            </Menu.Trigger>
            <Portal>
              <Menu.Positioner>
                <Menu.Content
                  bg="white"
                  border="1px solid"
                  borderColor="gray.200"
                  borderRadius="md"
                  boxShadow="lg"
                  py={1}
                >
                  <Menu.Item
                    value="edit"
                    onClick={() => onEdit?.(review)}
                    cursor="pointer"
                    _hover={{ bg: 'primary.200' }}
                  >
                    <HStack gap={2}>
                      <MdEdit size={16} />
                      <Text>Edit</Text>
                    </HStack>
                  </Menu.Item>
                  <Menu.Item
                    value="delete"
                    onClick={() => onDelete?.(review)}
                    cursor="pointer"
                    _hover={{ bg: 'red.100' }}
                    color="red.500"
                  >
                    <HStack gap={2}>
                      <MdDelete size={16} />
                      <Text>Delete</Text>
                    </HStack>
                  </Menu.Item>
                </Menu.Content>
              </Menu.Positioner>
            </Portal>
          </Menu.Root>
        )}
      </HStack>

      {review.reviewText && (
        <Text fontSize="sm" color="gray.700" lineHeight="1.6" mb={3}>
          {review.reviewText}
        </Text>
      )}
    </Box>
  );
}
