'use client';

import { EbookBorrowRequestApi } from '@/api';
import { Button, Dialog, Table, toaster } from '@/components';
import { useDialog } from '@/lib/hooks';
import { MyEbookItem } from '@/types/ebook-borrow-request';
import { Badge, Box, HStack, Image, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { LuBookOpen, LuRotateCcw } from 'react-icons/lu';

interface MyEbooksListProps {
  ebooks: MyEbookItem[];
  page: number;
  pageSize: number;
  total: number;
  loading?: boolean;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onRefresh?: () => void;
}

export function MyEbooksList({
  ebooks,
  page,
  pageSize,
  total,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onRefresh,
}: MyEbooksListProps) {
  const router = useRouter();
  const [returningId, setReturningId] = useState<number | null>(null);
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();

  const handleReadEbook = (bookId: number) => {
    router.push(`/ebooks/${bookId}/view`);
  };

  const handleReturnEbook = (item: MyEbookItem) => {
    if (returningId) return;

    const bookTitle = item.book.title;

    openDialog({
      title: 'Confirm Return Ebook',
      message: `Are you sure you want to return "${bookTitle}"?`,
      confirmText: 'Return',
      cancelText: 'Cancel',
      onConfirm: async () => {
        setReturningId(item.borrowRecordId);

        try {
          await EbookBorrowRequestApi.returnEbook(item.borrowRecordId);

          toaster.create({
            title: 'Success',
            description: 'Ebook returned successfully',
            type: 'success',
          });

          if (onRefresh) {
            onRefresh();
          }
        } catch (error: unknown) {
          const errorMessage =
            error instanceof Error ? error.message : 'Failed to return ebook. Please try again.';

          toaster.create({
            title: 'Error',
            description: errorMessage,
            type: 'error',
          });
        } finally {
          setReturningId(null);
        }
      },
    });
  };

  const columns = [
    {
      key: 'book',
      header: 'Book',
      render: (item: MyEbookItem) => (
        <HStack gap={3} align="start">
          <Image
            src={item.book.coverImageUrl || ''}
            alt={item.book.title}
            width="60px"
            height="90px"
            objectFit="cover"
            borderRadius="md"
            flexShrink={0}
          />
          <VStack align="start" gap={1} flex={1}>
            <Text
              fontWeight="medium"
              fontSize="sm"
              style={{
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {item.book.title}
            </Text>
            <Text fontSize="xs" color="secondaryText.500">
              by {item.book.author.fullName}
            </Text>
            {item.book.publishYear && (
              <Text fontSize="xs" color="secondaryText.500">
                {item.book.publishYear}
              </Text>
            )}
          </VStack>
        </HStack>
      ),
    },
    {
      key: 'borrowDate',
      header: 'Borrow Date',
      render: (item: MyEbookItem) => (
        <Text fontSize="sm">{new Date(item.borrowDate).toLocaleDateString()}</Text>
      ),
    },
    {
      key: 'returnDate',
      header: 'Return Date',
      render: (item: MyEbookItem) => (
        <Text fontSize="sm">{new Date(item.returnDate).toLocaleDateString()}</Text>
      ),
    },
    {
      key: 'daysRemaining',
      header: 'Days Remaining',
      render: (item: MyEbookItem) => {
        if (item.daysRemaining <= 0) {
          return (
            <Badge colorScheme="red" variant="subtle">
              Expired
            </Badge>
          );
        }
        if (item.daysRemaining <= 3) {
          return (
            <Badge colorScheme="orange" variant="subtle">
              {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} left
            </Badge>
          );
        }
        return (
          <Text fontSize="sm" color="secondaryText.500">
            {item.daysRemaining} day{item.daysRemaining !== 1 ? 's' : ''} left
          </Text>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      width: '200px',
      textAlign: 'center' as const,
      render: (item: MyEbookItem) => (
        <HStack gap={2}>
          <Button
            variantType="primary"
            size="sm"
            h="40px"
            onClick={() => handleReadEbook(item.bookId)}
            icon={LuBookOpen}
            label="Read"
          />
          <Button
            variantType="secondary"
            size="sm"
            h="40px"
            onClick={() => handleReturnEbook(item)}
            icon={LuRotateCcw}
            label={returningId === item.borrowRecordId ? 'Returning...' : 'Return'}
            disabled={returningId !== null}
          />
        </HStack>
      ),
    },
  ];

  if (ebooks.length === 0 && !loading) {
    return (
      <Box textAlign="center" py={10}>
        <Text fontSize="lg" color="secondaryText.500">
          No ebooks currently borrowed
        </Text>
        <Text fontSize="sm" color="secondaryText.500" mt={2}>
          Borrow an ebook to see it here
        </Text>
      </Box>
    );
  }

  return (
    <>
      <Table
        columns={columns}
        data={ebooks}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />

      {/* Return Confirmation Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={handleCancel}
        title={dialog.title}
        content={dialog.message}
        buttons={[
          {
            label: dialog.cancelText,
            onClick: handleCancel,
            variant: 'secondary',
          },
          {
            label: dialog.confirmText,
            onClick: handleConfirm,
            variant: 'primary',
          },
        ]}
        showCloseButton={false}
      />
    </>
  );
}
