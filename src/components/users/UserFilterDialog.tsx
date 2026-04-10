'use client';

import { Dialog, FormField, FormSelect } from '@/components';
import { VStack } from '@chakra-ui/react';
import { Role, UserStatus } from '@prisma/client';

export interface UserFilterState {
  selectedRole: string;
  selectedStatus: string;
}

export interface UserFilterParams {
  role?: Role;
  status?: UserStatus;
}

export interface UserFilterDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: () => void;
  onClear: () => void;
  filterState: UserFilterState;
  onFilterStateChange: (newState: Partial<UserFilterState>) => void;
}

// Role options
const ROLE_OPTIONS = [
  { label: 'All Roles', value: '' },
  { label: 'Admin', value: Role.ADMIN },
  { label: 'Librarian', value: Role.LIBRARIAN },
  { label: 'Reader', value: Role.READER },
];

// Status options
const STATUS_OPTIONS = [
  { label: 'All Status', value: '' },
  { label: 'Active', value: UserStatus.ACTIVE },
  { label: 'Inactive', value: UserStatus.INACTIVE },
];

export function UserFilterDialog({
  isOpen,
  onClose,
  onApply,
  onClear,
  filterState,
  onFilterStateChange,
}: UserFilterDialogProps) {
  const handleApplyFilter = () => {
    onApply();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Filter Users"
      content={
        <VStack gap={4} align="stretch">
          {/* Role Filter */}
          <FormField label="Role">
            <FormSelect
              items={ROLE_OPTIONS}
              value={filterState.selectedRole}
              onChange={value => onFilterStateChange({ selectedRole: value })}
              placeholder="Select role"
              variantType="filter"
              height="50px"
            />
          </FormField>

          {/* Status Filter */}
          <FormField label="Status">
            <FormSelect
              items={STATUS_OPTIONS}
              value={filterState.selectedStatus}
              onChange={value => onFilterStateChange({ selectedStatus: value })}
              placeholder="Select status"
              variantType="filter"
              height="50px"
            />
          </FormField>
        </VStack>
      }
      buttons={[
        {
          label: 'Clear',
          variant: 'secondary',
          onClick: onClear,
        },
        {
          label: 'Apply Filter',
          variant: 'primary',
          onClick: handleApplyFilter,
        },
      ]}
    />
  );
}
