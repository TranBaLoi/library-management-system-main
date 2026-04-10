'use client';

import { BorrowRequestApi } from '@/api';
import {
  Dialog,
  FormSelect,
  LibrarianBorrowRequestColumns,
  SearchInput,
  Table,
  toaster,
} from '@/components';
import { useDialog } from '@/lib/hooks';
import { BorrowRequestStatus, BorrowRequestWithBookAndUser } from '@/types/borrow-request';
import { HStack, Stack } from '@chakra-ui/react';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function DashboardBorrowRequestsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [requests, setRequests] = useState<BorrowRequestWithBookAndUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BorrowRequestStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [query, setQuery] = useState('');
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();

  const fetchBorrowRequests = useCallback(async () => {
    try {
      setLoading(true);

      const response = await BorrowRequestApi.getAllBorrowRequests({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
      });

      setRequests(response.borrowRequests);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch borrow requests',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchBorrowRequests();
  }, [fetchBorrowRequests]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(query);
      setPage(1); // Reset to first page when searching
    }, 500);

    return () => clearTimeout(timer);
  }, [query]);

  // Status filter options
  const statusFilterOptions = useMemo(
    () => [
      { value: '', label: 'All Status' },
      { value: BorrowRequestStatus.PENDING, label: 'Pending' },
      { value: BorrowRequestStatus.APPROVED, label: 'Approved' },
      { value: BorrowRequestStatus.FULFILLED, label: 'Fulfilled' },
      { value: BorrowRequestStatus.REJECTED, label: 'Rejected' },
      { value: BorrowRequestStatus.CANCELLED, label: 'Cancelled' },
      { value: BorrowRequestStatus.EXPIRED, label: 'Expired' },
    ],
    []
  );

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as BorrowRequestStatus | '');
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
  };

  // Handle approve borrow request
  const handleApproveBorrowRequest = (borrowRequest: BorrowRequestWithBookAndUser) => {
    const bookTitle = borrowRequest.items[0]?.book.title || 'this request';
    const userName = borrowRequest.user?.fullName || 'user';

    openDialog({
      title: 'Confirm Approve Request',
      message: `Are you sure you want to approve the borrow request for "${bookTitle}" by ${userName}?`,
      confirmText: 'Approve',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await BorrowRequestApi.approveBorrowRequest(borrowRequest.id);
          toaster.create({
            title: 'Success',
            description: 'Borrow request approved successfully',
            type: 'success',
          });
          fetchBorrowRequests();
        } catch (error) {
          toaster.create({
            title: 'Failed',
            description: error instanceof Error ? error.message : 'Failed to approve request',
            type: 'error',
          });
        }
      },
    });
  };

  // Handle reject borrow request
  const handleRejectBorrowRequest = (borrowRequest: BorrowRequestWithBookAndUser) => {
    const bookTitle = borrowRequest.items[0]?.book.title || 'this request';
    const userName = borrowRequest.user?.fullName || 'user';

    openDialog({
      title: 'Confirm Reject Request',
      message: `Are you sure you want to reject the borrow request for "${bookTitle}" by ${userName}?`,
      confirmText: 'Reject',
      cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await BorrowRequestApi.rejectBorrowRequest(borrowRequest.id);
          toaster.create({
            title: 'Success',
            description: 'Borrow request rejected successfully',
            type: 'success',
          });
          fetchBorrowRequests();
        } catch (error) {
          toaster.create({
            title: 'Failed',
            description: error instanceof Error ? error.message : 'Failed to reject request',
            type: 'error',
          });
        }
      },
    });
  };

  // Filter requests by search query
  const filteredRequests = searchQuery
    ? requests.filter(
        request =>
          request.items[0]?.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.items[0]?.book.author.fullName
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          request.items[0]?.book.isbn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.user?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          request.user?.email.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : requests;

  const borrowRequestColumns = LibrarianBorrowRequestColumns(
    handleApproveBorrowRequest,
    handleRejectBorrowRequest
  );

  return (
    <Stack gap={4} height="100%">
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <HStack gap={4} alignItems="center" flexWrap="wrap">
          <SearchInput
            width={{ base: '100%', md: '400px' }}
            placeholder="Search by book title, author, ISBN, user..."
            value={query}
            onChange={handleSearch}
          />
        </HStack>
        <FormSelect
          items={statusFilterOptions}
          value={statusFilter}
          onChange={handleStatusFilterChange}
          placeholder="All Status"
          width="150px"
          variantType="filter"
          fontSize="sm"
          height="40px"
        />
      </HStack>

      <Table
        columns={borrowRequestColumns}
        data={filteredRequests}
        page={page}
        pageSize={pageSize}
        total={searchQuery ? filteredRequests.length : total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
      />

      {/* Confirmation Dialog */}
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
    </Stack>
  );
}
