'use client';

import { IconButton, Tag } from '@/components';
import { CONDITION_LABELS, ROUTES, STATUS_LABELS } from '@/constants';
import { formatDate } from '@/lib/utils';
import { BookItemWithBook } from '@/types';
import { HStack, Image, Text, VStack } from '@chakra-ui/react';
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
function ActionsCell({ bookItem }: { bookItem: BookItemWithBook }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.BOOKS_COPIES}/edit/${bookItem.id}`);
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="Edit book copy" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
    </HStack>
  );
}

export const BookItemColumns = () => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '60px',
    render: (bookItem: BookItemWithBook) => <Text>{bookItem.id}</Text>,
  },
  {
    key: 'book',
    header: 'Book',
    sortable: false,
    width: '200px',
    render: (bookItem: BookItemWithBook) => (
      <HStack gap={3}>
        <Image
          src={bookItem.book.coverImageUrl ?? undefined}
          alt={bookItem.book.title}
          width="40px"
          height="60px"
          objectFit="cover"
          borderRadius="sm"
        />
        <VStack align="start" gap={1}>
          <Text fontWeight="medium">{bookItem.book.title}</Text>
          <Text fontSize="sm" color="gray.600">
            {bookItem.book.isbn}
          </Text>
        </VStack>
      </HStack>
    ),
  },
  {
    key: 'author',
    header: 'Author',
    sortable: false,
    width: '150px',
    render: (bookItem: BookItemWithBook) => <Text>{bookItem.book.author.fullName}</Text>,
  },
  {
    key: 'code',
    header: 'Code',
    sortable: true,
    width: '120px',
    render: (bookItem: BookItemWithBook) => <Text fontWeight="medium">{bookItem.code}</Text>,
  },
  {
    key: 'condition',
    header: 'Condition',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (bookItem: BookItemWithBook) => <ConditionCell condition={bookItem.condition} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '100px',
    textAlign: 'center' as const,
    render: (bookItem: BookItemWithBook) => <StatusCell status={bookItem.status} />,
  },
  {
    key: 'acquisitionDate',
    header: 'Acquisition Date',
    sortable: true,
    width: '120px',
    textAlign: 'center' as const,
    render: (bookItem: BookItemWithBook) => <AcquisitionDateCell date={bookItem.acquisitionDate} />,
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '120px',
    textAlign: 'center' as const,
    render: (bookItem: BookItemWithBook) => <ActionsCell bookItem={bookItem} />,
  },
];
