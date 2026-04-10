'use client';

import { BorrowRecordApi } from '@/api';
import {
  FormSelect,
  LibrarianBorrowRecordColumns,
  SearchInput,
  Table,
  toaster,
} from '@/components';
import { ROUTES } from '@/constants';
import { BorrowRecordWithDetails, BorrowStatus } from '@/types/borrow-record';
import { HStack, Stack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function DashboardBorrowRecordsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<BorrowRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [query, setQuery] = useState('');

  const fetchBorrowRecords = useCallback(async () => {
    try {
      setLoading(true);

      const response = await BorrowRecordApi.getAllBorrowRecords({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });

      setRecords(response.borrowRecords);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch borrow records',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, statusFilter, searchQuery]);

  useEffect(() => {
    fetchBorrowRecords();
  }, [fetchBorrowRecords]);

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
      { value: BorrowStatus.BORROWED, label: 'Borrowed' },
      { value: BorrowStatus.RETURNED, label: 'Returned' },
      { value: BorrowStatus.OVERDUE, label: 'Overdue' },
    ],
    []
  );

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value as BorrowStatus | '');
    setPage(1);
  };

  const handleSearch = (value: string) => {
    setQuery(value);
  };

  const handleReturnClick = (record: BorrowRecordWithDetails) => {
    router.push(ROUTES.DASHBOARD.BORROW_RECORDS_RETURN + `/${record.id}`);
  };

  const handleViewClick = (record: BorrowRecordWithDetails) => {
    router.push(ROUTES.DASHBOARD.BORROW_RECORDS + `/${record.id}`);
  };

  const borrowRecordColumns = LibrarianBorrowRecordColumns({
    onReturnClick: handleReturnClick,
    onViewClick: handleViewClick,
  });

  return (
    <Stack gap={4} height="100%">
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <HStack gap={4} alignItems="center" flexWrap="wrap">
          <SearchInput
            width={{ base: '100%', md: '400px' }}
            placeholder="Search by user name or email..."
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
        columns={borrowRecordColumns}
        data={records}
        page={page}
        pageSize={pageSize}
        total={total}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={(size: number) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Stack>
  );
}
