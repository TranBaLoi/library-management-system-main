'use client';

import { EXTENSION_DAYS } from '@/constants/borrow-record';
import { formatDate } from '@/lib/utils';
import { BorrowRecordWithDetails } from '@/types/borrow-record';
import { Box, Text, VStack } from '@chakra-ui/react';

interface RenewBorrowRecordFormProps {
  borrowRecord: BorrowRecordWithDetails;
  newReturnDate: Date;
}

export function RenewBorrowRecordForm({ borrowRecord, newReturnDate }: RenewBorrowRecordFormProps) {
  const currentReturnDate = borrowRecord.returnDate ? formatDate(borrowRecord.returnDate) : 'N/A';

  return (
    <VStack gap={6} align="stretch">
      <Box>
        <Text fontSize="md" fontWeight="medium" mb={2}>
          Borrow Record ID
        </Text>
        <Text fontSize="sm">{borrowRecord.id}</Text>
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="medium" mb={2}>
          Current Return Date
        </Text>
        <Text fontSize="sm">{currentReturnDate}</Text>
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="medium" mb={2}>
          New Return Date
        </Text>
        <Text fontSize="sm">
          {formatDate(newReturnDate)} (After {EXTENSION_DAYS} days)
        </Text>
      </Box>
    </VStack>
  );
}
