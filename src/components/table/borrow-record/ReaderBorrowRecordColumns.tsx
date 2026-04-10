'use client';

import { IconButton, Tag } from '@/components';
import { MAX_RENEWALS } from '@/constants/borrow-record';
import { formatDate } from '@/lib/utils';
import { BorrowRecordWithDetails, BorrowStatus } from '@/types/borrow-record';
import { HStack, Text } from '@chakra-ui/react';
import { HiOutlineArrowPath } from 'react-icons/hi2';
import { LuEye } from 'react-icons/lu';
import { BorrowRecordStatusCell } from './BorrowRecordStatusCell';

// Component to render renewal count with color coding
function RenewalCountCell({ renewalCount }: { renewalCount: number }) {
  const getRenewalColor = (count: number): 'active' | 'inactive' => {
    if (count >= MAX_RENEWALS) {
      return 'inactive';
    }
    return 'active';
  };

  return (
    <Tag variantType={getRenewalColor(renewalCount)}>
      {renewalCount}/{MAX_RENEWALS}
    </Tag>
  );
}

// Component Actions for Reader
function ReaderActionsCell({
  borrowRecord,
  onRenewClick,
  onViewClick,
}: {
  borrowRecord: BorrowRecordWithDetails;
  onRenewClick?: (borrowRecord: BorrowRecordWithDetails) => void;
  onViewClick?: (borrowRecord: BorrowRecordWithDetails) => void;
}) {
  const handleView = () => {
    if (onViewClick) {
      onViewClick(borrowRecord);
    }
  };

  const handleRenew = () => {
    if (onRenewClick) {
      onRenewClick(borrowRecord);
    }
  };

  // Check if renewal is allowed
  const canRenew = (() => {
    // Must be BORROWED and not returned
    if (borrowRecord.status !== BorrowStatus.BORROWED || borrowRecord.actualReturnDate) {
      return false;
    }

    // Must not be overdue
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (borrowRecord.returnDate) {
      const returnDate = new Date(borrowRecord.returnDate);
      returnDate.setHours(0, 0, 0, 0);
      if (returnDate < today) {
        return false;
      }
    }

    // Must not exceed max renewals
    if (borrowRecord.renewalCount >= MAX_RENEWALS) {
      return false;
    }

    return true;
  })();

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View book" onClick={handleView}>
        <LuEye />
      </IconButton>
      <IconButton aria-label="Renew book" onClick={handleRenew} disabled={!canRenew}>
        <HiOutlineArrowPath />
      </IconButton>
    </HStack>
  );
}

export const ReaderBorrowRecordColumns = (
  onRenewClick?: (borrowRecord: BorrowRecordWithDetails) => void,
  onViewClick?: (borrowRecord: BorrowRecordWithDetails) => void
) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '40px',
    render: (record: BorrowRecordWithDetails) => <Text>{record.id}</Text>,
  },
  {
    key: 'quantity',
    header: 'Quantity',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => {
      const physicalCount = record.borrowBooks?.length || 0;
      const ebookCount = record.borrowEbooks?.length || 0;
      return <Text>{physicalCount + ebookCount}</Text>;
    },
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
    render: (record: BorrowRecordWithDetails) => (
      <RenewalCountCell renewalCount={record.renewalCount || 0} />
    ),
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
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => (
      <Text fontSize="sm">{formatDate(record.createdAt)}</Text>
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (record: BorrowRecordWithDetails) => (
      <ReaderActionsCell
        borrowRecord={record}
        onRenewClick={onRenewClick}
        onViewClick={onViewClick}
      />
    ),
  },
];
