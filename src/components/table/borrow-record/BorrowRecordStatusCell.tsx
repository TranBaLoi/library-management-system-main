'use client';

import { Tag } from '@/components';
import { BorrowStatus } from '@/types/borrow-record';

interface BorrowRecordStatusCellProps {
  status: BorrowStatus;
}

export function BorrowRecordStatusCell({ status }: BorrowRecordStatusCellProps) {
  const statusConfig: Record<
    BorrowStatus,
    { variantType: 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost'; label: string }
  > = {
    [BorrowStatus.BORROWED]: { variantType: 'borrowed', label: 'Borrowed' },
    [BorrowStatus.RETURNED]: { variantType: 'active', label: 'Returned' },
    [BorrowStatus.OVERDUE]: { variantType: 'lost', label: 'Overdue' },
  };

  const config = statusConfig[status] || statusConfig[BorrowStatus.BORROWED];

  return <Tag variantType={config.variantType}>{config.label}</Tag>;
}
