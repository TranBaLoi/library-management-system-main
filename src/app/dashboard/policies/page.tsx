'use client';

import { PolicyApi } from '@/api';
import { Button, Dialog, PolicyColumns, SearchInput, Table, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { Policy } from '@/types';
import { HStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';
import { IoAddSharp } from 'react-icons/io5';

export default function PoliciesPage() {
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Fetch policies from API
  const fetchPolicies = useCallback(async () => {
    try {
      setLoading(true);

      const response = await PolicyApi.getPolicies({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });

      setPolicies(response.policies);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch policies',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder]);

  // Fetch policies when page, pageSize, searchQuery changes
  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

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

  // Handle policy status change
  const handleChangePolicyStatus = (policy: Policy) => {
    const newIsDeleted = !policy.isDeleted;
    const actionText = newIsDeleted ? 'deactivate' : 'activate';

    openDialog({
      title: 'Confirm Change Policy Status',
      message: `Do you want to ${actionText} this policy "${policy.name}"?`,
      confirmText: `${actionText.charAt(0).toUpperCase() + actionText.slice(1)} Policy`,
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await PolicyApi.updatePolicy(policy.id, { isDeleted: newIsDeleted });
          toaster.create({
            title: 'Success',
            description: `Policy ${actionText}d successfully`,
            type: 'success',
          });
          fetchPolicies();
        } catch (error) {
          console.error('Error changing policy status:', error);
          toaster.create({
            title: 'Error',
            description: `Failed to ${actionText} policy`,
            type: 'error',
          });
        }
      },
    });
  };

  // Create columns with status change callback
  const policyColumns = PolicyColumns(handleChangePolicyStatus);

  return (
    <>
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
        <HStack gap={4} alignItems="center">
          <SearchInput
            width="400px"
            placeholder="Search policies by name or ID"
            value={query}
            onChange={handleSearch}
          />
        </HStack>
        <Button
          label="Add Policy"
          variantType="primary"
          w="auto"
          h="40px"
          px={2}
          fontSize="sm"
          href={ROUTES.DASHBOARD.POLICIES_ADD}
          icon={IoAddSharp}
        />
      </HStack>
      <Table
        columns={policyColumns}
        data={policies}
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

      {/* Status Change Confirmation Dialog */}
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
}
