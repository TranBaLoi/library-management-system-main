'use client';

import { Notification, NotificationApi } from '@/api/notification.api';
import { Dialog, Spinner } from '@/components';
import { Box, HStack, Separator, Text, VStack } from '@chakra-ui/react';
import { NotificationStatus, NotificationType } from '@prisma/client';
import { useCallback, useEffect, useState } from 'react';

/**
 * Notification Detail Dialog Props
 */
export interface NotificationDetailDialogProps {
  isOpen: boolean;
  onClose: () => void;
  notificationId: number | null;
  onMarkAsRead?: () => void; // Callback after marking as read
}

/**
 * Notification Detail Dialog Component
 * Displays notification detail and automatically marks it as read when opened
 */
export function NotificationDetailDialog({
  isOpen,
  onClose,
  notificationId,
  onMarkAsRead,
}: NotificationDetailDialogProps) {
  const [notification, setNotification] = useState<Notification | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isMarkingAsRead, setIsMarkingAsRead] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Format time helper
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

  // Format full date and time
  const formatFullDateTime = useCallback((date: Date) => {
    try {
      return new Date(date).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Invalid date';
    }
  }, []);

  // Get notification type label
  const getTypeLabel = useCallback((type: NotificationType) => {
    switch (type) {
      case NotificationType.SYSTEM:
        return 'System';
      case NotificationType.REMINDER:
        return 'Reminder';
      case NotificationType.ALERT:
        return 'Alert';
      case NotificationType.OTHER:
        return 'Other';
      default:
        return type;
    }
  }, []);

  // Fetch notification detail and mark as read
  useEffect(() => {
    if (!isOpen || !notificationId) {
      setNotification(null);
      return;
    }

    const fetchAndMarkAsRead = async () => {
      try {
        setIsLoading(true);
        setNotification(null);
        setError(null);

        // Fetch notification detail
        const detail = await NotificationApi.getNotificationById(notificationId);
        console.log('Fetched notification detail:', detail);

        if (!detail) {
          setError('Notification not found');
          return;
        }

        // Parse dates from string to Date objects
        const parsedDetail: Notification = {
          ...detail,
          createdAt: new Date(detail.createdAt),
          updatedAt: new Date(detail.updatedAt),
          readAt: detail.readAt ? new Date(detail.readAt) : null,
        };

        setNotification(parsedDetail);

        // Mark as read if unread
        if (parsedDetail.status === NotificationStatus.UNREAD) {
          setIsMarkingAsRead(true);
          try {
            await NotificationApi.markAsRead(notificationId);
            // Update local state
            setNotification((prev: Notification | null) =>
              prev ? { ...prev, status: NotificationStatus.READ, readAt: new Date() } : null
            );
            // Call callback
            onMarkAsRead?.();
          } catch (error) {
            console.error('Failed to mark notification as read:', error);
            setError('Failed to mark notification as read');
          } finally {
            setIsMarkingAsRead(false);
          }
        }
      } catch (error) {
        console.error('Failed to fetch notification detail:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to fetch notification detail';
        setError(errorMessage);
        setNotification(null);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAndMarkAsRead();
  }, [isOpen, notificationId, onMarkAsRead]);

  const dialogContent = isLoading ? (
    <VStack p={8} gap={4}>
      <Spinner size="32px" />
      <Text color="gray.500" fontSize="sm">
        Loading notification...
      </Text>
    </VStack>
  ) : error ? (
    <VStack p={8} gap={2}>
      <Text color="red.500" fontSize="sm" fontWeight="medium">
        Error
      </Text>
      <Text color="gray.500" fontSize="sm">
        {error}
      </Text>
    </VStack>
  ) : !notification ? (
    <VStack p={8} gap={2}>
      <Text color="gray.500" fontSize="sm">
        Notification not found
      </Text>
    </VStack>
  ) : (
    <VStack align="stretch" gap={4} p={2}>
      {/* Title */}
      <Box>
        <Text fontSize="lg" fontWeight="bold" mb={2}>
          {notification.title}
        </Text>
        <HStack gap={2}>
          <Text fontSize="xs" color="gray.500">
            Type: {getTypeLabel(notification.type)}
          </Text>
          <Text fontSize="xs" color="gray.500">
            •
          </Text>
          <Text fontSize="xs" color="gray.500">
            Status:{' '}
            <Text
              as="span"
              fontWeight="semibold"
              color={notification.status === NotificationStatus.UNREAD ? 'primary.500' : 'gray.600'}
            >
              {notification.status === NotificationStatus.UNREAD ? 'Unread' : 'Read'}
            </Text>
          </Text>
        </HStack>
      </Box>

      <Separator />

      {/* Message */}
      <Box>
        <Text fontSize="sm" fontWeight="semibold" mb={2} color="gray.700">
          Message
        </Text>
        <Text fontSize="sm" color="gray.600" lineHeight="1.6" whiteSpace="pre-wrap">
          {notification.message}
        </Text>
      </Box>

      <Separator />

      {/* Timestamps */}
      <VStack align="stretch" gap={2}>
        <HStack justify="space-between">
          <Text fontSize="xs" color="gray.500" fontWeight="medium">
            Created:
          </Text>
          <Text fontSize="xs" color="gray.600">
            {formatFullDateTime(notification.createdAt)} ({formatTime(notification.createdAt)})
          </Text>
        </HStack>
        {notification.readAt && (
          <HStack justify="space-between">
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Read:
            </Text>
            <Text fontSize="xs" color="gray.600">
              {formatFullDateTime(notification.readAt)} ({formatTime(notification.readAt)})
            </Text>
          </HStack>
        )}
      </VStack>

      {/* Marking as read indicator */}
      {isMarkingAsRead && (
        <Box p={2} bg="blue.50" borderRadius="md">
          <Text fontSize="xs" color="blue.600">
            Marking as read...
          </Text>
        </Box>
      )}
    </VStack>
  );

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Notification Detail"
      maxW="600px"
      content={dialogContent}
      buttons={[
        {
          label: 'Close',
          variant: 'primary',
          onClick: onClose,
        },
      ]}
    />
  );
}
