'use client';

import { Button, IconButton, Spinner } from '@/components';
import { useMarkAllAsRead, useNotifications, useUnreadCount } from '@/lib/hooks';
import {
  Badge,
  Box,
  HStack,
  Popover,
  Portal,
  Separator,
  Stack,
  Text,
  VStack,
} from '@chakra-ui/react';
import { NotificationStatus } from '@prisma/client';
import { useCallback, useState } from 'react';
import { FiBell } from 'react-icons/fi';
import { NotificationDetailDialog } from './NotificationDetailDialog';

/**
 * Notification Bell Component
 * Displays a bell icon with unread count badge and dropdown with notifications list
 */
export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotificationId, setSelectedNotificationId] = useState<number | null>(null);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  // Get unread count for badge
  const {
    count: unreadCount,
    isLoading: isLoadingCount,
    refetch: refetchUnreadCount,
  } = useUnreadCount();
  // Get all notifications (read and unread) with lazy loading
  const { notifications, isLoading, isLoadingMore, hasMore, loadMore, refetch } = useNotifications({
    limit: 10,
    enableLazyLoad: true, // Enable lazy loading
    // No status filter - get all notifications
  });
  const markAllAsRead = useMarkAllAsRead();

  const handleNotificationClick = useCallback((id: number) => {
    // Close popover first
    setIsOpen(false);
    // Open detail dialog
    setSelectedNotificationId(id);
    setIsDetailDialogOpen(true);
  }, []);

  const handleDetailDialogClose = useCallback(() => {
    setIsDetailDialogOpen(false);
    setSelectedNotificationId(null);
  }, []);

  const handleDetailDialogMarkAsRead = useCallback(() => {
    // Refetch notifications and unread count after marking as read in dialog
    refetch();
    refetchUnreadCount();
  }, [refetch, refetchUnreadCount]);

  const handleMarkAllAsRead = useCallback(async () => {
    await markAllAsRead.mutateAsync();
    // Refetch notifications and unread count after marking all as read
    refetch();
    refetchUnreadCount();
  }, [markAllAsRead, refetch, refetchUnreadCount]);

  const formatTime = useCallback((date: Date) => {
    try {
      const now = new Date();
      const notificationDate = new Date(date);
      const diffInSeconds = Math.floor((now.getTime() - notificationDate.getTime()) / 1000);

      if (diffInSeconds < 60) {
        return 'Just now';
      } else if (diffInSeconds < 3600) {
        const minutes = Math.floor(diffInSeconds / 60);
        return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 86400) {
        const hours = Math.floor(diffInSeconds / 3600);
        return `${hours} hour${hours > 1 ? 's' : ''} ago`;
      } else if (diffInSeconds < 604800) {
        const days = Math.floor(diffInSeconds / 86400);
        return `${days} day${days > 1 ? 's' : ''} ago`;
      } else {
        return notificationDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: notificationDate.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
        });
      }
    } catch {
      return 'Recently';
    }
  }, []);

  return (
    <Popover.Root
      open={isOpen}
      onOpenChange={e => setIsOpen(e.open)}
      positioning={{ placement: 'bottom-end' }}
    >
      <Popover.Trigger asChild>
        <Box position="relative">
          <IconButton aria-label="Notifications" borderColor="gray.200">
            <FiBell size={20} />
          </IconButton>
          {!isLoadingCount && unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="red"
              variant="solid"
              bg="red.500"
              color="white"
              borderRadius="full"
              minW="20px"
              h="20px"
              display="flex"
              alignItems="center"
              justifyContent="center"
              fontSize="xs"
              fontWeight="bold"
              px={1}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Box>
      </Popover.Trigger>

      <Portal>
        <Popover.Positioner>
          <Popover.Content
            bg="white"
            border="1px solid"
            borderColor="gray.200"
            borderRadius="md"
            boxShadow="lg"
            width="400px"
            maxH="500px"
            overflow="hidden"
            display="flex"
            flexDirection="column"
          >
            {/* Header */}
            <HStack
              justify="space-between"
              align="center"
              p={4}
              borderBottom="1px solid"
              borderColor="gray.200"
            >
              <Text fontSize="lg" fontWeight="bold">
                Notifications
              </Text>
              {unreadCount > 0 && (
                <Button
                  label="Mark all as read"
                  variantType="ghost"
                  onClick={handleMarkAllAsRead}
                  loading={markAllAsRead.isPending}
                  fontSize="xs"
                  h="auto"
                  py={1}
                  px={2}
                />
              )}
            </HStack>

            {/* Notifications List */}
            <Box flex="1" overflowY="auto">
              {isLoading ? (
                <VStack p={8} gap={4}>
                  <Spinner size="32px" />
                  <Text color="gray.500" fontSize="sm">
                    Loading notifications...
                  </Text>
                </VStack>
              ) : notifications.length === 0 ? (
                <VStack p={8} gap={2}>
                  <FiBell size={48} color="#9CA3AF" />
                  <Text color="gray.500" fontSize="sm" fontWeight="medium">
                    No notifications
                  </Text>
                  <Text color="gray.400" fontSize="xs">
                    You don&apos;t have any notifications yet
                  </Text>
                </VStack>
              ) : (
                <Stack gap={0}>
                  {notifications.map((notification, index) => (
                    <Box key={notification.id}>
                      <HStack
                        p={4}
                        gap={3}
                        align="flex-start"
                        _hover={{ bg: 'gray.50' }}
                        cursor="pointer"
                        onClick={() => handleNotificationClick(notification.id)}
                      >
                        {/* Notification indicator dot - only show for unread */}
                        {notification.status === NotificationStatus.UNREAD ? (
                          <Box
                            w="8px"
                            h="8px"
                            borderRadius="full"
                            bg="primary.500"
                            flexShrink={0}
                            mt={1.5}
                          />
                        ) : (
                          <Box w="8px" h="8px" flexShrink={0} mt={1.5} />
                        )}

                        {/* Notification content */}
                        <VStack align="flex-start" gap={1} flex={1}>
                          <Text fontSize="sm" fontWeight="semibold" lineHeight="1.4">
                            {notification.title}
                          </Text>
                          <Text fontSize="xs" color="gray.600" lineHeight="1.4">
                            {notification.message}
                          </Text>
                          <Text fontSize="xs" color="gray.400">
                            {formatTime(notification.createdAt)}
                          </Text>
                        </VStack>
                      </HStack>
                      {index < notifications.length - 1 && <Separator />}
                    </Box>
                  ))}
                  {/* Loading more indicator */}
                  {isLoadingMore && (
                    <>
                      <Separator />
                      <VStack p={4} gap={2}>
                        <Spinner size="24px" />
                        <Text fontSize="xs" color="gray.400">
                          Loading more...
                        </Text>
                      </VStack>
                    </>
                  )}
                </Stack>
              )}
            </Box>

            {/* Footer - Load more button */}
            {notifications.length > 0 && (
              <>
                <Separator />
                <Box p={3} textAlign="center">
                  {hasMore ? (
                    <Button
                      label={isLoadingMore ? 'Loading...' : 'Load more'}
                      variantType="ghost"
                      fontSize="xs"
                      width="full"
                      onClick={loadMore}
                      loading={isLoadingMore}
                      h="auto"
                      py={2}
                    />
                  ) : (
                    <Text fontSize="xs" color="gray.400">
                      No more notifications
                    </Text>
                  )}
                </Box>
              </>
            )}
          </Popover.Content>
        </Popover.Positioner>
      </Portal>

      {/* Notification Detail Dialog */}
      <NotificationDetailDialog
        isOpen={isDetailDialogOpen}
        onClose={handleDetailDialogClose}
        notificationId={selectedNotificationId}
        onMarkAsRead={handleDetailDialogMarkAsRead}
      />
    </Popover.Root>
  );
}
