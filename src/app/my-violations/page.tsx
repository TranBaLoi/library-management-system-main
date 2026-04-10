'use client';

import { PaymentApi } from '@/api';
import { MyPaymentColumns, SearchInput, Table, toaster } from '@/components';
import { ROUTES } from '@/constants';
import { PaymentWithDetails } from '@/types';
import { HStack, Stack } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

export default function MyViolationsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);

  // Fetch payments from API
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      const response = await PaymentApi.getMyPayments({
        page,
        limit: pageSize,
        search: searchQuery || undefined,
        sortBy: sortBy || undefined,
        sortOrder: sortOrder || undefined,
      });

      setPayments(response.payments);
      setTotal(response.pagination.total);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to fetch violations',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, searchQuery, sortBy, sortOrder]);

  // Fetch payments when page, pageSize, searchQuery changes
  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

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

  // Handle view payment - redirect to detail page
  const handleViewPayment = useCallback(
    (payment: PaymentWithDetails) => {
      router.push(`${ROUTES.MY_VIOLATIONS}/${payment.id}`);
    },
    [router]
  );

  // Create columns
  const paymentColumns = MyPaymentColumns(handleViewPayment);

  return (
    <Stack
      gap={4}
      bg="white"
      p={6}
      rounded="lg"
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <HStack gap={4} alignItems="center" flexWrap="wrap">
          <SearchInput
            width="500px"
            placeholder="Search violations by ID or policy name"
            value={query}
            onChange={handleSearch}
          />
        </HStack>
      </HStack>
      <Table
        columns={paymentColumns}
        data={payments}
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
  );
}
