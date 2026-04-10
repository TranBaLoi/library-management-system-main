'use client';

import { Tag } from '@/components';
import { UserStatus } from '@prisma/client';

interface EntityStatusCellProps<T> {
  item: T;
  onChangeStatus?: (item: T) => void;
}

type EntityWithStatus = { isDeleted: boolean } | { status: UserStatus };

export function EntityStatusCell<T extends EntityWithStatus>({
  item,
  onChangeStatus,
}: EntityStatusCellProps<T>) {
  const handleStatusClick = () => {
    if (onChangeStatus) {
      onChangeStatus(item);
    }
  };

  // Check if item has isDeleted property (for entities like Book, Category, Author)
  const isDeleted = 'isDeleted' in item ? item.isDeleted : false;
  // Check if item has status property (for User)
  const userStatus = 'status' in item ? item.status : null;

  // Determine if entity is active/inactive
  const isActive = userStatus ? userStatus === UserStatus.ACTIVE : !isDeleted;

  return (
    <Tag
      variantType={isActive ? 'active' : 'inactive'}
      onClick={onChangeStatus ? handleStatusClick : undefined}
      cursor={onChangeStatus ? 'pointer' : 'default'}
      _hover={onChangeStatus ? { opacity: 0.8 } : undefined}
    >
      {isActive ? 'Active' : 'Inactive'}
    </Tag>
  );
}
