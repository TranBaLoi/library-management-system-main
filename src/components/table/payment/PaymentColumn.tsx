'use client';

import { IconButton, Tag } from '@/components';
import { formatDate } from '@/lib/utils';
import { PaymentWithDetails } from '@/types';
import { HStack, Text, VStack } from '@chakra-ui/react';
import { LuEye } from 'react-icons/lu';

// Component to format amount
function AmountCell({ amount }: { amount: number }) {
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
  return <Text>{formattedAmount} VND</Text>;
}

// Component to format date
function DateCell({ date }: { date: Date | null | undefined }) {
  if (!date) return <Text color="gray.500">—</Text>;
  return <Text fontSize="sm">{formatDate(date)}</Text>;
}

// Component to show payment status
function PaymentStatusCell({ isPaid }: { isPaid: boolean }) {
  return <Tag variantType={isPaid ? 'active' : 'inactive'}>{isPaid ? 'Paid' : 'Unpaid'}</Tag>;
}

// Component to show user info
function UserCell({ payment }: { payment: PaymentWithDetails }) {
  const user = payment.borrowRecord?.user;
  if (!user) return <Text color="gray.500">—</Text>;

  return (
    <VStack align="start" gap={1}>
      <Text fontWeight="medium">{user.fullName}</Text>
      <Text fontSize="sm" color="gray.600">
        {user.email}
      </Text>
    </VStack>
  );
}

// Component Actions
function ActionsCell({
  payment,
  onViewClick,
}: {
  payment: PaymentWithDetails;
  onViewClick?: (payment: PaymentWithDetails) => void;
}) {
  const handleView = () => {
    if (onViewClick) {
      onViewClick(payment);
    }
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="View violation" onClick={handleView}>
        <LuEye />
      </IconButton>
    </HStack>
  );
}

export const PaymentColumns = (onViewClick?: (payment: PaymentWithDetails) => void) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '80px',
    render: (payment: PaymentWithDetails) => <Text>{payment.id}</Text>,
  },
  {
    key: 'user',
    header: 'User',
    sortable: false,
    width: '250px',
    render: (payment: PaymentWithDetails) => <UserCell payment={payment} />,
  },
  {
    key: 'policy',
    header: 'Policy',
    sortable: false,
    width: '200px',
    render: (payment: PaymentWithDetails) => <Text>{payment.policy?.name || '—'}</Text>,
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    width: '150px',
    render: (payment: PaymentWithDetails) => <AmountCell amount={payment.amount} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (payment: PaymentWithDetails) => <PaymentStatusCell isPaid={payment.isPaid} />,
  },
  {
    key: 'dueDate',
    header: 'Due Date',
    sortable: true,
    width: '150px',
    render: (payment: PaymentWithDetails) => <DateCell date={payment.dueDate} />,
  },
  {
    key: 'paidAt',
    header: 'Paid At',
    sortable: true,
    width: '150px',
    render: (payment: PaymentWithDetails) => <DateCell date={payment.paidAt} />,
  },
  {
    key: 'createdAt',
    header: 'Created At',
    sortable: true,
    width: '150px',
    render: (payment: PaymentWithDetails) => <DateCell date={payment.createdAt} />,
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '100px',
    textAlign: 'center' as const,
    render: (payment: PaymentWithDetails) => (
      <ActionsCell payment={payment} onViewClick={onViewClick} />
    ),
  },
];
