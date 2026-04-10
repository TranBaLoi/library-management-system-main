'use client';

import { IconButton, UserCell } from '@/components';
import { formatDate } from '@/lib/utils';
import { BorrowRecordWithDetails, BorrowStatus } from '@/types/borrow-record';
import { HStack, Text } from '@chakra-ui/react';
import { LuEye } from 'react-icons/lu';
import { PiCheckFat } from 'react-icons/pi';
import { BorrowRecordStatusCell } from './BorrowRecordStatusCell';

// Component Actions for Librarian
function LibrarianActionsCell({
  borrowRecord,
  onReturnClick,
  onViewClick,
}: {
  borrowRecord: BorrowRecordWithDetails;
  onReturnClick?: (record: BorrowRecordWithDetails) => void;
  onViewClick?: (record: BorrowRecordWithDetails) => void;
}) {
  const handleView = () => {
    onViewClick?.(borrowRecord);
  };

  const handleReturn = () => onReturnClick?.(borrowRecord);

  const canReturn = borrowRecord.status === BorrowStatus.BORROWED && !borrowRecord.actualReturnDate;

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View book" onClick={handleView}>
        <LuEye />
      </IconButton>
      <IconButton aria-label="Return books" onClick={handleReturn} disabled={!canReturn}>
        <PiCheckFat />
      </IconButton>
    </HStack>
  );
}

export const LibrarianBorrowRecordColumns = (opts?: {
  onReturnClick?: (record: BorrowRecordWithDetails) => void;
  onViewClick?: (record: BorrowRecordWithDetails) => void;
}) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '40px',
    render: (record: BorrowRecordWithDetails) => <Text>{record.id}</Text>,
  },
  {
    key: 'user',
    header: 'Borrower',
    sortable: false,
    width: '200px',
    render: (record: BorrowRecordWithDetails) => <UserCell user={record.user} />,
  },
  {
    key: 'quantity',
    header: 'Quantity',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => <Text>{record.borrowBooks?.length || 0}</Text>,
  },
  {
    key: 'borrowDate',
    header: 'Borrow Date',
    sortable: true,
    width: '180px',
    render: (record: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(record.borrowDate)}</Text>
    ),
  },
  {
    key: 'returnDate',
    header: 'Expected Return',
    sortable: true,
    width: '180px',
    render: (record: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(record.returnDate)}</Text>
    ),
  },
  {
    key: 'actualReturnDate',
    header: 'Actual Return',
    sortable: true,
    width: '180px',
    render: (record: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(record.actualReturnDate)}</Text>
    ),
  },
  {
    key: 'renewalCount',
    header: 'Renewals',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => <Text>{record.renewalCount || 0}</Text>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => <BorrowRecordStatusCell status={record.status} />,
  },
  {
    key: 'createdAt',
    header: 'Created At',
    sortable: true,
    width: '150px',
    render: (record: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(record.createdAt)}</Text>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '100px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => (
      <LibrarianActionsCell
        borrowRecord={record}
        onReturnClick={opts?.onReturnClick}
        onViewClick={opts?.onViewClick}
      />
    ),
  },
];
