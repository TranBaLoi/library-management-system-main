'use client';

import { EntityStatusCell, IconButton } from '@/components';
import { ROUTES } from '@/constants';
import { Category } from '@/types';
import { HStack, Text, VStack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { LuPencil } from 'react-icons/lu';

// Component to render action buttons
function ActionsCell({ category }: { category: Category }) {
  const router = useRouter();

  const handleEdit = () => {
    router.push(`${ROUTES.DASHBOARD.CATEGORIES_EDIT}/${category.id}`);
  };

  return (
    <HStack gap={2} justifyContent="center">
      <IconButton aria-label="Edit category" onClick={handleEdit}>
        <LuPencil />
      </IconButton>
    </HStack>
  );
}

// Component to render description with truncation
function DescriptionCell({ description }: { description: string | null | undefined }) {
  if (!description) return <Text>N/A</Text>;

  return (
    <Text title={description} textAlign="justify">
      {description}
    </Text>
  );
}

export const CategoryColumns = (onChangeStatus?: (category: Category) => void) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '60px',
    render: (category: Category) => <Text>{category.id}</Text>,
  },
  {
    key: 'name',
    header: 'Category Name',
    width: '280px',
    sortable: true,
    render: (category: Category) => (
      <VStack align="start" gap={1}>
        <Text fontWeight="medium">{category.name}</Text>
      </VStack>
    ),
  },
  {
    key: 'description',
    header: 'Description',
    sortable: false,
    render: (category: Category) => <DescriptionCell description={category.description} />,
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '150px',
    render: (category: Category) => (
      <EntityStatusCell item={category} onChangeStatus={onChangeStatus || (() => {})} />
    ),
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '150px',
    textAlign: 'center' as const,
    render: (category: Category) => <ActionsCell category={category} />,
  },
];
