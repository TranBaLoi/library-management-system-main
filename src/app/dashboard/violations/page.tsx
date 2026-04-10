'use client';

import { BorrowRecordApi, PaymentApi } from '@/api';
import { PaymentColumns, RecordViolationDialog, SearchInput, Table, toaster } from '@/components';
import { policyIdToCondition } from '@/constants/violation';
import { PaymentWithDetails } from '@/types';
import { BookItemForViolation, BorrowRecordWithDetails } from '@/types/borrow-record';
import { HStack } from '@chakra-ui/react';
import { useCallback, useEffect, useState } from 'react';

export default function ViolationsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [payments, setPayments] = useState<PaymentWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<PaymentWithDetails | null>(null);
  const [borrowRecord, setBorrowRecord] = useState<BorrowRecordWithDetails | null>(null);
  const [bookItem, setBookItem] = useState<BookItemForViolation | null>(null);

  // Fetch payments from API
  const fetchPayments = useCallback(async () => {
    try {
      setLoading(true);

      const response = await PaymentApi.getPayments({
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

  // Handle view payment
  const handleViewPayment = useCallback(async (payment: PaymentWithDetails) => {
    try {
      setSelectedPayment(payment);

      // Fetch borrow record with book items
      const borrowRecordData = await BorrowRecordApi.getBorrowRecordById(payment.borrowRecordId);
      setBorrowRecord(borrowRecordData);

      // Find bookItem based on policy condition
      const condition = policyIdToCondition(payment.policyId);
      const matchingBookItem = borrowRecordData.borrowBooks?.find(
        bb => bb.bookItem.condition === condition
      )?.bookItem;

      // If no matching condition, use first bookItem
      const selectedBookItem = matchingBookItem || borrowRecordData.borrowBooks?.[0]?.bookItem;

      if (selectedBookItem) {
        setBookItem({
          id: selectedBookItem.id,
          code: selectedBookItem.code,
          condition: selectedBookItem.condition,
          book: selectedBookItem.book
            ? {
                id: selectedBookItem.book.id,
                title: selectedBookItem.book.title,
                price: selectedBookItem.book.price,
                author: selectedBookItem.book.author
                  ? {
                      id: selectedBookItem.book.author.id,
                      fullName: selectedBookItem.book.author.fullName,
                    }
                  : undefined,
              }
            : null,
        });
      }

      setIsDialogOpen(true);
    } catch {
      toaster.create({
        title: 'Failed',
        description: 'Failed to load violation details',
        type: 'error',
      });
    }
  }, []);

  // Handle close dialog
  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setSelectedPayment(null);
    setBorrowRecord(null);
    setBookItem(null);
  };

  // Create columns
  const paymentColumns = PaymentColumns(handleViewPayment);

  return (
    <>
      <HStack mb={4} gap={4} justifyContent="space-between" alignItems="center">
        <HStack gap={4} alignItems="center">
          <SearchInput
            width="500px"
            placeholder="Search violations by ID, policy name, or user name/email"
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

      {/* View Violation Dialog */}
      {isDialogOpen && borrowRecord && bookItem && selectedPayment && (
        <RecordViolationDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          borrowRecord={borrowRecord}
          bookItem={bookItem}
          newCondition={bookItem.condition || ''}
          initialViolation={{
            amount: selectedPayment.amount,
            dueDate: selectedPayment.dueDate
              ? new Date(selectedPayment.dueDate).toISOString().split('T')[0]
              : undefined,
          }}
          viewOnly={true}
          payment={selectedPayment}
        />
      )}
    </>
  );
}
