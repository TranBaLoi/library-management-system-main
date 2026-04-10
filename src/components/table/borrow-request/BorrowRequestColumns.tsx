'use client';

import { IconButton } from '@/components';
import { BookCell } from '@/components/books';
import { formatDate } from '@/lib/utils';
import { BorrowRequestStatus, BorrowRequestWithBook } from '@/types/borrow-request';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuEye } from 'react-icons/lu';
import { MdOutlineCancel } from 'react-icons/md';
import { BorrowRequestStatusCell } from './BorrowRequestStatusCell';
import { QueuePositionCell } from './QueuePositionCell';

// Component Actions
function ActionsCell({
  borrowRequest,
  onCancelClick,
}: {
  borrowRequest: BorrowRequestWithBook;
  onCancelClick?: (borrowRequest: BorrowRequestWithBook) => void;
}) {
  const router = useRouter();

  const handleView = () => {
    // Navigate to book detail
    const bookId = borrowRequest.items[0]?.bookId;
    if (bookId) {
      router.push(`/books/${bookId}`);
    }
  };

  const handleCancel = () => {
    if (onCancelClick) {
      onCancelClick(borrowRequest);
    }
  };

  const canCancel =
    borrowRequest.status === BorrowRequestStatus.PENDING ||
    borrowRequest.status === BorrowRequestStatus.APPROVED;

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View book" onClick={handleView}>
        <LuEye />
      </IconButton>
      <IconButton aria-label="Cancel borrow request" onClick={handleCancel} disabled={!canCancel}>
        <MdOutlineCancel />
      </IconButton>
    </HStack>
  );
}

export const BorrowRequestColumns = (
  onCancelClick?: (borrowRequest: BorrowRequestWithBook) => void
) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '60px',
    render: (request: BorrowRequestWithBook) => <Text>{request.id}</Text>,
  },
  {
    key: 'book',
    header: 'Book',
    sortable: false,
    render: (request: BorrowRequestWithBook) => {
      const item = request.items[0]; // Each request only has 1 item
      const { title, coverImageUrl, author, isbn, publishYear } = item.book;
      return (
        <Box py={2}>
          <BookCell
            title={title}
            coverImageUrl={coverImageUrl}
            authorName={author.fullName}
            isbn={isbn}
            publishYear={publishYear}
          />
        </Box>
      );
    },
  },
  {
    key: 'quantity',
    header: 'Quantity',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBook) => <Text>{request.items[0]?.quantity || 1}</Text>,
  },
  {
    key: 'startDate',
    header: 'Borrow Date',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBook) => (
      <Text fontSize="sm">{formatDate(request.items[0]?.startDate || request.startDate)}</Text>
    ),
  },
  {
    key: 'endDate',
    header: 'Return Date',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBook) => (
      <Text fontSize="sm">{formatDate(request.items[0]?.endDate || request.endDate)}</Text>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBook) => <BorrowRequestStatusCell status={request.status} />,
  },
  {
    key: 'queuePosition',
    header: 'Queue Position',
    sortable: false,
    width: '150px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBook) => {
      const item = request.items[0];
      return <QueuePositionCell position={item?.queuePosition} />;
    },
  },
  {
    key: 'createdAt',
    header: 'Requested At',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBook) => (
      <Text fontSize="sm">{formatDate(request.createdAt)}</Text>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '140px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBook) => (
      <ActionsCell borrowRequest={request} onCancelClick={onCancelClick} />
    ),
  },
];
