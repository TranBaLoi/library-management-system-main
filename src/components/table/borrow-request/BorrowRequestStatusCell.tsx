'use client';

import { Tag } from '@/components';
import { BorrowRequestStatus } from '@/types/borrow-request';

interface BorrowRequestStatusCellProps {
  status: BorrowRequestStatus;
}

export function BorrowRequestStatusCell({ status }: BorrowRequestStatusCellProps) {
  const statusConfig: Record<
    BorrowRequestStatus,
    { variantType: 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost'; label: string }
  > = {
    [BorrowRequestStatus.PENDING]: { variantType: 'reserved', label: 'Pending' },
    [BorrowRequestStatus.APPROVED]: { variantType: 'active', label: 'Approved' },
    [BorrowRequestStatus.REJECTED]: { variantType: 'inactive', label: 'Rejected' },
    [BorrowRequestStatus.FULFILLED]: { variantType: 'active', label: 'Fulfilled' },
    [BorrowRequestStatus.CANCELLED]: { variantType: 'lost', label: 'Cancelled' },
    [BorrowRequestStatus.EXPIRED]: { variantType: 'inactive', label: 'Expired' },
  };

  const config = statusConfig[status] || statusConfig[BorrowRequestStatus.PENDING];

  return <Tag variantType={config.variantType}>{config.label}</Tag>;
}
