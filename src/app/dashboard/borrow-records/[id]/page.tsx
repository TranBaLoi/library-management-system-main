'use client';

import { BorrowRecordApi } from '@/api';
import { toaster } from '@/components';
import { ReturnBorrowRecordForm } from '@/components/borrow-records';
import { ROUTES } from '@/constants';
import { BorrowRecordWithDetails } from '@/types/borrow-record';
import { Box } from '@chakra-ui/react';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BorrowRecordDetailPage() {
  const params = useParams();
  const router = useRouter();
  const borrowRecordId = Number(params.id);
  const [borrowRecord, setBorrowRecord] = useState<BorrowRecordWithDetails | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch borrow record data
  useEffect(() => {
    const fetchBorrowRecord = async () => {
      if (!borrowRecordId || borrowRecordId <= 0) {
        router.push(ROUTES.DASHBOARD.BORROW_RECORDS);
        return;
      }

      try {
        const recordData = await BorrowRecordApi.getBorrowRecordById(borrowRecordId);
        setBorrowRecord(recordData);
      } catch (err) {
        console.error('Error fetching borrow record:', err);
        toaster.create({
          title: 'Error',
          description: 'Borrow record not found',
          type: 'error',
        });
        router.push(ROUTES.DASHBOARD.BORROW_RECORDS);
      } finally {
        setLoading(false);
      }
    };

    fetchBorrowRecord();
  }, [borrowRecordId, router]);

  const handleClose = () => {
    router.push(ROUTES.DASHBOARD.BORROW_RECORDS);
  };

  const handleReturnClick = () => {
    router.push(`${ROUTES.DASHBOARD.BORROW_RECORDS_RETURN}/${borrowRecordId}`);
  };

  if (loading) {
    return null;
  }

  if (!borrowRecord) {
    return null;
  }

  return (
    <Box height="100%">
      <ReturnBorrowRecordForm
        borrowRecord={borrowRecord}
        onClose={handleClose}
        readOnly
        onReturnClick={handleReturnClick}
      />
    </Box>
  );
}
