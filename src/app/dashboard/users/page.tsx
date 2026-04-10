'use client';

import { UserApi } from '@/api';
import { Button, Dialog, SearchInput, Table, toaster, UserColumns } from '@/components';
import { UserFilterDialog } from '@/components/users';
import { ROUTES } from '@/constants';
import { useDialog, useUserFilters } from '@/lib/hooks';
import { PublicUser } from '@/types/user';
import { HStack, Stack } from '@chakra-ui/react';
import { UserStatus } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { FiFilter } from 'react-icons/fi';
import { IoAddSharp } from 'react-icons/io5';

export default function UsersPage() {
  const router = useRouter();
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();

  // #region State Management
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [users, setUsers] = useState<PublicUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Filter management
  const {
    isFilterDialogOpen,
    openFilterDialog,
    closeFilterDialog,
    filterState,
    updateFilterState,
    appliedFilters,
    applyFilters,
    clearFilters,
  } = useUserFilters();
  // #endregion

  // #region Fetch Users
  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);

      const response = await UserApi.getUsers({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        role: appliedFilters.role,
        status: appliedFilters.status,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });

      setUsers(response.users);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Error fetching users:', error);
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch users',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, appliedFilters, sortBy, sortOrder]);

  // Fetch users when filters change
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);
  // #endregion

  // #region Search Debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);
  // #endregion

  // #region Event Handlers
  // Handle sort functionality
  const handleSort = (key: string, direction: 'asc' | 'desc' | null) => {
    setSortBy(direction ? key : null);
    setSortOrder(direction);
    setPage(1); // Reset to first page when sorting
  };

  // Handle search input
  const handleSearch = (value: string) => {
    setQuery(value);
  };

  // Handle filter actions
  const handleApplyFilter = () => {
    setPage(1); // Reset to first page when applying filter
    applyFilters();
  };

  const handleClearFilter = () => {
    setPage(1);
    clearFilters();
  };

  // Handle edit user
  const handleEditUser = (user: PublicUser) => {
    router.push(`${ROUTES.DASHBOARD.USERS}/edit/${user.id}`);
  };

  // Handle delete user (uses bulk delete API with single user ID)
  const handleDeleteUser = (user: PublicUser) => {
    openDialog({
      title: 'Confirm Delete User',
      message: `Are you sure you want to delete user "${user.fullName}"? This action cannot be undone.`,
      confirmText: 'Delete User',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          // Use bulk delete API even for single user deletion
          const result = await UserApi.bulkDeleteUsers([user.id]);

          if (result.deletedCount > 0) {
            toaster.create({
              title: 'Success',
              description: 'User deleted successfully',
              type: 'success',
            });
            fetchUsers();
          } else {
            toaster.create({
              title: 'Error',
              description: 'User not found or could not be deleted',
              type: 'error',
            });
          }
        } catch (error: unknown) {
          console.error('Error deleting user:', error);
          toaster.create({
            title: 'Error',
            description: (error as Error)?.message || 'Failed to delete user',
            type: 'error',
          });
        }
      },
    });
  };

  // Handle change user status
  const handleChangeStatus = (user: PublicUser) => {
    const newStatus = user.status === UserStatus.ACTIVE ? UserStatus.INACTIVE : UserStatus.ACTIVE;
    const actionText = newStatus === UserStatus.INACTIVE ? 'deactivate' : 'activate';

    openDialog({
      title: 'Confirm Change User Status',
      message: `Do you want to ${actionText} user "${user.fullName}"?`,
      confirmText: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} User`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await UserApi.updateUser(user.id, { status: newStatus });
          toaster.create({
            title: 'Success',
            description: `User ${actionText}d successfully`,
            type: 'success',
          });
          fetchUsers();
        } catch (error: unknown) {
          console.error('Error updating user status:', error);
          toaster.create({
            title: 'Error',
            description: (error as Error)?.message || `Failed to ${actionText} user`,
            type: 'error',
          });
        }
      },
    });
  };
  // #endregion

  // #region Table Columns
  const userColumns = UserColumns(handleEditUser, handleDeleteUser, handleChangeStatus);
  // #endregion

  // #region Render
  return (
    <>
      <Stack gap={4}>
        {/* Search and Actions */}
        <HStack justifyContent="space-between" alignItems="center" flexWrap="wrap">
          <HStack gap={4} alignItems="center">
            {/* Filter Button */}
            <Button
              label="Filter"
              variantType="tertiary"
              w="auto"
              h="40px"
              px={2}
              fontSize="sm"
              icon={FiFilter}
              onClick={openFilterDialog}
            />

            {/* Search Input */}
            <SearchInput
              width={{ base: '100%', md: '400px' }}
              placeholder="Search users by name or email"
              value={query}
              onChange={handleSearch}
            />
          </HStack>

          {/* Add User Button */}
          <Button
            label="Add User"
            variantType="primary"
            w="auto"
            h="40px"
            px={4}
            fontSize="sm"
            href={`${ROUTES.DASHBOARD.USERS}/add`}
            icon={IoAddSharp}
          />
        </HStack>

        {/* Users Table */}
        <Table
          columns={userColumns}
          data={users}
          page={page}
          pageSize={pageSize}
          total={total}
          loading={loading}
          onPageChange={setPage}
          onPageSizeChange={(size: number) => {
            setPageSize(size);
            setPage(1);
          }}
          onSort={handleSort}
        />
      </Stack>

      {/* Filter Dialog */}
      <UserFilterDialog
        isOpen={isFilterDialogOpen}
        onClose={closeFilterDialog}
        onApply={handleApplyFilter}
        onClear={handleClearFilter}
        filterState={filterState}
        onFilterStateChange={updateFilterState}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={handleCancel}
        title={dialog.title}
        content={dialog.message}
        buttons={[
          {
            label: dialog.cancelText,
            onClick: handleCancel,
            variant: 'secondary',
          },
          {
            label: dialog.confirmText,
            onClick: handleConfirm,
            variant: 'primary',
          },
        ]}
        showCloseButton={false}
      />
    </>
  );
  // #endregion
}
