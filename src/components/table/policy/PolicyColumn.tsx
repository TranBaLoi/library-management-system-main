'use client';

import { EntityStatusCell, IconButton } from '@/components';
import { ROUTES } from '@/constants';
import { Policy } from '@/types';
import { HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuPencil } from 'react-icons/lu';

// Component to render action buttons
function ActionsCell({ policy }: { policy: Policy }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.POLICIES_EDIT}/${policy.id}`);
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="Edit policy" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
    </HStack>
  );
}

// Component to format amount with unit
function AmountCell({
  amount,
  unit,
}: {
  amount: number;
  unit: 'FIXED' | 'PER_DAY';
}) {
  // All policies with FIXED unit represent percentage of book value
  // PER_DAY policies represent amount in VND per day
  if (unit === 'FIXED') {
    return (
      <VStack align="start" gap={1}>
        <Text>{amount}% of book value</Text>
      </VStack>
    );
  }

  // For PER_DAY unit, show amount in VND/day
  const formattedAmount = new Intl.NumberFormat('vi-VN').format(amount);
  return (
    <VStack align="start" gap={1}>
      <Text>
        {formattedAmount} VND/day
      </Text>
    </VStack>
  );
}

export const PolicyColumns = (onChangeStatus?: (policy: Policy) => void) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '120px',
    render: (policy: Policy) => <Text>{policy.id}</Text>,
  },
  {
    key: 'name',
    header: 'Policy Name',
    width: '300px',
    sortable: true,
    render: (policy: Policy) => (
      <VStack align="start" gap={1}>
        <Text fontWeight="medium">{policy.name}</Text>
      </VStack>
    ),
  },
  {
    key: 'amount',
    header: 'Amount',
    sortable: true,
    width: '200px',
    render: (policy: Policy) => (
      <AmountCell amount={policy.amount} unit={policy.unit} />
    ),
  },
  {
    key: 'unit',
    header: 'Unit',
    sortable: true,
    width: '150px',
    render: (policy: Policy) => <Text>{policy.unit === 'FIXED' ? 'Fixed' : 'Per Day'}</Text>,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '100px',
    render: (policy: Policy) => (
      <EntityStatusCell item={policy} onChangeStatus={onChangeStatus || (() => {})} />
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '100px',
    textAlign: 'center' as const,
    render: (policy: Policy) => <ActionsCell policy={policy} />,
  },
];
