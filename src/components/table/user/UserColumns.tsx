'use client';

import { IconButton, Tag } from '@/components';
import { EntityStatusCell } from '@/components/table';
import { UserCell } from '@/components/user';
import { formatDate } from '@/lib/utils';
import { PublicUser } from '@/types/user';
import { HStack, Text } from '@chakra-ui/react';
import { Role } from '@prisma/client';
import { LuPencil, LuTrash2 } from 'react-icons/lu';

const getRoleVariantType = (
  role: Role
): 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost' => {
  switch (role) {
    case Role.ADMIN:
      return 'lost';
    case Role.LIBRARIAN:
      return 'reserved';
    case Role.READER:
      return 'active';
    default:
      return 'active';
  }
};

/**
 * User table columns configuration
 */
export const UserColumns = (
  onEdit: (user: PublicUser) => void,
  onDelete: (user: PublicUser) => void,
  onChangeStatus?: (user: PublicUser) => void
) => [
  {
    key: 'id',
    header: 'ID',
    sortable: true,
    width: '80px',
    render: (user: PublicUser) => <Text fontWeight="medium">{user.id}</Text>,
  },
  {
    key: 'fullName',
    header: 'Full Name',
    sortable: true,
    render: (user: PublicUser) => (
      <UserCell user={{ fullName: user.fullName, email: user.email }} variant="stack" />
    ),
  },
  {
    key: 'role',
    header: 'Role',
    sortable: true,
    width: '120px',
    render: (user: PublicUser) => {
      return <Tag variantType={getRoleVariantType(user.role)}>{user.role}</Tag>;
    },
  },
  {
    key: 'status',
    header: 'Status',
    sortable: true,
    width: '120px',
    render: (user: PublicUser) => <EntityStatusCell item={user} onChangeStatus={onChangeStatus} />,
  },
  {
    key: 'violationPoints',
    header: 'Violation Points',
    sortable: true,
    width: '180px',
    render: (user: PublicUser) => (
      <Text fontSize="sm" fontWeight="medium">
        {user.violationPoints ?? 0} points
      </Text>
    ),
  },
  {
    key: 'phoneNumber',
    header: 'Phone',
    width: '140px',
    render: (user: PublicUser) => <Text fontSize="sm">{user.phoneNumber || '-'}</Text>,
  },
  {
    key: 'createdAt',
    header: 'Created At',
    sortable: true,
    width: '140px',
    render: (user: PublicUser) => <Text fontSize="sm">{formatDate(user.createdAt)}</Text>,
  },
  {
    key: 'actions',
    header: 'Actions',
    sortable: false,
    width: '150px',
    textAlign: 'center' as const,
    render: (user: PublicUser) => (
      <HStack gap={2} justifyContent="center">
        <IconButton aria-label="Edit user" onClick={() => onEdit(user)}>
          <LuPencil />
        </IconButton>
        <IconButton
          aria-label="Delete user"
          onClick={() => onDelete(user)}
          colorScheme="red"
          variant="ghost"
        >
          <LuTrash2 />
        </IconButton>
      </HStack>
    ),
  },
];
