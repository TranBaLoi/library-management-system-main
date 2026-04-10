'use client';

import { BorrowRecordApi } from '@/api';
import { Dialog, FormSelect, ReaderBorrowRecordColumns, Table, toaster } from '@/components';
import { RenewBorrowRecordForm } from '@/components/borrow-records/RenewBorrowRecordForm';
import { EXTENSION_DAYS, MAX_RENEWALS, ROUTES } from '@/constants';
import { useDialog } from '@/lib/hooks';
import { BorrowRecordWithDetails, BorrowStatus } from '@/types/borrow-record';
import { HStack, Stack, Text } from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

export default function MyBorrowRecordsPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [records, setRecords] = useState<BorrowRecordWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<BorrowStatus | ''>('');
  const [renewingRecord, setRenewingRecord] = useState<BorrowRecordWithDetails | null>(null);
  const [newReturnDate, setNewReturnDate] = useState<Date | null>(null);
  const { dialog, openDialog, handleConfirm, handleCancel } = useDialog();

  const fetchBorrowRecords = useCallback(async () => {
    try {
      setLoading(true);

      const response = await BorrowRecordApi.getMyBorrowRecords({
        page,
        limit: pageSize,
        status: statusFilter || undefined,
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
  }, [page, pageSize, statusFilter]);

  useEffect(() => {
    fetchBorrowRecords();
  }, [fetchBorrowRecords]);

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

  // Handle renew borrow record
  const handleRenewBorrowRecord = useCallback(
    (borrowRecord: BorrowRecordWithDetails) => {
      const calculatedNewReturnDate = borrowRecord.returnDate
        ? new Date(
            new Date(borrowRecord.returnDate).setDate(
              new Date(borrowRecord.returnDate).getDate() + EXTENSION_DAYS
            )
          )
        : new Date();

      setRenewingRecord(borrowRecord);
      setNewReturnDate(calculatedNewReturnDate);

      openDialog({
        title: 'Renew Borrow Record',
        message: '',
        confirmText: 'Renew',
        cancelText: 'Cancel',
        onConfirm: async () => {
          try {
            const response = await BorrowRecordApi.renewBorrowRecord(borrowRecord.id);
            toaster.create({
              title: 'Success',
              description: response.message || 'Borrow record renewed successfully',
              type: 'success',
            });
            setRenewingRecord(null);
            setNewReturnDate(null);
            fetchBorrowRecords();
          } catch (error) {
            toaster.create({
              title: 'Failed',
              description: error instanceof Error ? error.message : 'Failed to renew borrow record',
              type: 'error',
            });
          }
        },
        onCancel: () => {
          setRenewingRecord(null);
          setNewReturnDate(null);
        },
      });
    },
    [openDialog, fetchBorrowRecords]
  );

  const handleViewClick = (record: BorrowRecordWithDetails) => {
    router.push(`${ROUTES.MY_BORROW_RECORDS}/${record.id}`);
  };

  const borrowRecordColumns = ReaderBorrowRecordColumns(handleRenewBorrowRecord, handleViewClick);

  return (
    <Stack height="100%" bg="white" p={6} rounded="lg">
      <HStack mb={4} justifyContent="space-between" alignItems="center" flexWrap="wrap">
        <HStack gap={1}>
          <Text fontSize="sm" fontWeight="medium">
            Renewal rules:
          </Text>
          <Text fontSize="sm" color="secondaryText.500">
            Maximum {MAX_RENEWALS} renewals, {EXTENSION_DAYS} days extension each. Cannot renew when
            overdue.
          </Text>
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

      {/* Renew Confirmation Dialog */}
      {dialog.isOpen && renewingRecord && newReturnDate && (
        <Dialog
          isOpen={dialog.isOpen}
          onClose={() => {
            handleCancel();
            setRenewingRecord(null);
            setNewReturnDate(null);
          }}
          title={dialog.title || 'Renew Borrow Record'}
          content={
            dialog.message ? (
              <>{dialog.message}</>
            ) : (
              <RenewBorrowRecordForm borrowRecord={renewingRecord} newReturnDate={newReturnDate} />
            )
          }
          buttons={[
            {
              label: dialog.cancelText,
              onClick: () => {
                handleCancel();
                setRenewingRecord(null);
                setNewReturnDate(null);
              },
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
      )}
    </Stack>
  );
}
