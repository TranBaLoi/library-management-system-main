'use client';

import { IconButton, UserCell } from '@/components';
import { BookCell } from '@/components/books';
import { formatDate } from '@/lib/utils';
import { BorrowRequestStatus, BorrowRequestWithBookAndUser } from '@/types/borrow-request';
import { Box, HStack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuCheck, LuEye, LuX } from 'react-icons/lu';
import { BorrowRequestStatusCell } from './BorrowRequestStatusCell';
import { QueuePositionCell } from './QueuePositionCell';

// Component Actions for Librarian
function LibrarianActionsCell({
  borrowRequest,
  onApproveClick,
  onRejectClick,
}: {
  borrowRequest: BorrowRequestWithBookAndUser;
  onApproveClick?: (borrowRequest: BorrowRequestWithBookAndUser) => void;
  onRejectClick?: (borrowRequest: BorrowRequestWithBookAndUser) => void;
}) {
  const router = useRouter();

  const handleView = () => {
    // Navigate to book detail
    const bookId = borrowRequest.items[0]?.bookId;
    if (bookId) {
      router.push(`/books/${bookId}`);
    }
  };

  const handleApprove = () => {
    if (onApproveClick) {
      onApproveClick(borrowRequest);
    }
  };

  const handleReject = () => {
    if (onRejectClick) {
      onRejectClick(borrowRequest);
    }
  };

  const canApprove = borrowRequest.status === BorrowRequestStatus.PENDING;
  const canReject =
    borrowRequest.status === BorrowRequestStatus.PENDING ||
    borrowRequest.status === BorrowRequestStatus.APPROVED;

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View book" onClick={handleView}>
        <LuEye />
      </IconButton>
      <IconButton
        aria-label="Approve borrow request"
        onClick={handleApprove}
        disabled={!canApprove}
      >
        <LuCheck />
      </IconButton>
      <IconButton aria-label="Reject borrow request" onClick={handleReject} disabled={!canReject}>
        <LuX />
      </IconButton>
    </HStack>
  );
}

export const LibrarianBorrowRequestColumns = (
  onApproveClick?: (borrowRequest: BorrowRequestWithBookAndUser) => void,
  onRejectClick?: (borrowRequest: BorrowRequestWithBookAndUser) => void
) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '60px',
    render: (request: BorrowRequestWithBookAndUser) => <Text>{request.id}</Text>,
  },
  {
    key: 'user',
    header: 'Requester',
    sortable: false,
    width: '200px',
    render: (request: BorrowRequestWithBookAndUser) => <UserCell user={request.user} />,
  },
  {
    key: 'book',
    header: 'Book',
    sortable: false,
    render: (request: BorrowRequestWithBookAndUser) => {
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
    render: (request: BorrowRequestWithBookAndUser) => (
      <Text>{request.items[0]?.quantity || 1}</Text>
    ),
  },
  {
    key: 'startDate',
    header: 'Borrow Date',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBookAndUser) => (
      <Text fontSize="sm">{formatDate(request.items[0]?.startDate || request.startDate)}</Text>
    ),
  },
  {
    key: 'endDate',
    header: 'Return Date',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBookAndUser) => (
      <Text fontSize="sm">{formatDate(request.items[0]?.endDate || request.endDate)}</Text>
    ),
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBookAndUser) => (
      <BorrowRequestStatusCell status={request.status} />
    ),
  },
  {
    key: 'queuePosition',
    header: 'Queue Position',
    sortable: false,
    width: '150px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBookAndUser) => {
      const item = request.items[0];
      return <QueuePositionCell position={item?.queuePosition} />;
    },
  },
  {
    key: 'createdAt',
    header: 'Requested At',
    sortable: true,
    width: '150px',
    render: (request: BorrowRequestWithBookAndUser) => (
      <Text fontSize="sm">{formatDate(request.createdAt)}</Text>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '160px',
    textAlign: 'center' as const,
    render: (request: BorrowRequestWithBookAndUser) => (
      <LibrarianActionsCell
        borrowRequest={request}
        onApproveClick={onApproveClick}
        onRejectClick={onRejectClick}
      />
    ),
  },
];
