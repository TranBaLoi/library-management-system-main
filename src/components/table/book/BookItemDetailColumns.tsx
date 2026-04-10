'use client';

import { IconButton, Tag } from '@/components';
import { CONDITION_LABELS, ROUTES, STATUS_LABELS } from '@/constants';
import { useMe } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { HStack, Text } from '@chakra-ui/react';
import { Condition, ItemStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { LuPencil } from 'react-icons/lu';

// Component to render condition with color coding
function ConditionCell({ condition }: { condition: string }) {
  const getConditionColor = (
    condition: string
  ): 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost' => {
    switch (condition.toUpperCase()) {
      case 'NEW':
        return 'active';
      case 'GOOD':
        return 'reserved';
      case 'WORN':
        return 'borrowed';
      case 'DAMAGED':
        return 'inactive';
      case 'LOST':
        return 'lost';
      default:
        return 'inactive';
    }
  };

  return (
    <Tag variantType={getConditionColor(condition)}>
      {CONDITION_LABELS[condition as Condition] || condition}
    </Tag>
  );
}

// Component to render status
function StatusCell({ status }: { status: string }) {
  const getStatusColor = (
    status: string
  ): 'active' | 'borrowed' | 'reserved' | 'inactive' | 'lost' => {
    switch (status.toUpperCase()) {
      case 'AVAILABLE':
        return 'active';
      case 'ON_BORROW':
        return 'borrowed';
      case 'RESERVED':
        return 'reserved';
      case 'MAINTENANCE':
        return 'borrowed';
      case 'RETIRED':
        return 'inactive';
      case 'LOST':
        return 'lost';
      default:
        return 'inactive';
    }
  };

  return (
    <Tag variantType={getStatusColor(status)}>{STATUS_LABELS[status as ItemStatus] || status}</Tag>
  );
}

// Component to render acquisition date
function AcquisitionDateCell({ date }: { date: Date | null }) {
  if (!date) return <Text color="gray.500">N/A</Text>;

  return <Text>{formatDate(date)}</Text>;
}

// Component to render action buttons
function ActionsCell({ bookItem }: { bookItem: { id: number; bookId: number } }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.BOOKS_COPIES}/edit/${bookItem.id}?bookId=${bookItem.bookId}`);
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="Edit book copy" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
    </HStack>
  );
}

export function createBookItemDetailColumns(isAdminOrLibrarian: boolean) {
  const baseColumns = [
    {
      key: 'code',
      header: 'Code',
      sortable: true,
      width: '120px',
      render: (item: { code: string }) => <Text fontWeight="medium">{item.code}</Text>,
    },
    {
      key: 'condition',
      header: 'Condition',
      sortable: true,
      width: '100px',
      textAlign: 'center' as const,
      render: (item: { condition: string }) => <ConditionCell condition={item.condition} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      width: '100px',
      textAlign: 'center' as const,
      render: (item: { status: string }) => <StatusCell status={item.status} />,
    },
    {
      key: 'acquisitionDate',
      header: 'Acquisition Date',
      sortable: true,
      width: '120px',
      textAlign: 'center' as const,
      render: (item: { acquisitionDate: Date | null }) => (
        <AcquisitionDateCell date={item.acquisitionDate} />
      ),
    },
  ];

  // Add actions column for admin and librarian
  if (isAdminOrLibrarian) {
    return [
      ...baseColumns,
      {
        key: 'actions',
        header: 'Actions',
        sortable: false,
        width: '120px',
        textAlign: 'center' as const,
        render: (item: { id: number; bookId: number }) => <ActionsCell bookItem={item} />,
      },
    ];
  }

  return baseColumns;
}

/**
 * Hook to get book item detail columns based on current user role
 * This hook uses useMe() internally
 */
export const BookItemDetailColumns = () => {
  const { data: user } = useMe();
  const isAdminOrLibrarian = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';
  return createBookItemDetailColumns(isAdminOrLibrarian);
};
