'use client';

import { FormInput, FormSelect } from '@/components';
import { Box, Text, VStack } from '@chakra-ui/react';

export type BorrowType = 'book-copy' | 'ebook';

interface BorrowRequestFormProps {
  startDate: string;
  endDate: string;
  borrowType?: BorrowType;
  hasEbook?: boolean;
  availableCount?: number;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  onBorrowTypeChange?: (type: BorrowType) => void;
  startDateError?: string;
  endDateError?: string;
}

export function BorrowRequestForm({
  startDate,
  endDate,
  borrowType = 'book-copy',
  hasEbook = false,
  availableCount = 0,
  onStartDateChange,
  onEndDateChange,
  onBorrowTypeChange,
  startDateError,
  endDateError,
}: BorrowRequestFormProps) {
  // Calculate max end date (30 days from start date)
  const getMaxEndDate = (): string => {
    if (!startDate) return '';
    const date = new Date(startDate);
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  };

  // Calculate min start date (today)
  const getMinStartDate = (): string => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  const maxEndDate = getMaxEndDate();
  const minStartDate = getMinStartDate();

  // Check availability based on selected type
  const isBookCopyAvailable = availableCount > 0;
  const isEbookAvailable = hasEbook;
  
  // Determine if inputs should be disabled
  const isDisabled = 
    (borrowType === 'book-copy' && !isBookCopyAvailable) ||
    (borrowType === 'ebook' && !isEbookAvailable);

  const borrowTypeOptions = [
    { label: 'Book Copy (Physical)', value: 'book-copy' },
    { label: 'Ebook (Digital)', value: 'ebook' },
  ];

  return (
    <VStack gap={6} align="stretch">
      {/* Borrow Type Selection */}
      {onBorrowTypeChange && (
        <Box>
          <Text fontSize="md" fontWeight="medium" mb={3}>
            Borrow Type
          </Text>
          <FormSelect
            items={borrowTypeOptions}
            value={borrowType}
            onChange={value => onBorrowTypeChange(value as BorrowType)}
            placeholder="Select borrow type"
            width="100%"
            height="50px"
          />
          {borrowType === 'book-copy' && !isBookCopyAvailable && (
            <Text fontSize="sm" color="red.500" mt={2}>
              No book copies available
            </Text>
          )}
          {borrowType === 'ebook' && !isEbookAvailable && (
            <Text fontSize="sm" color="red.500" mt={2}>
              Ebook not available
            </Text>
          )}
        </Box>
      )}
      <Box>
        <Text fontSize="md" fontWeight="medium" mb={3}>
          Start Date
        </Text>
        <FormInput
          type="date"
          value={startDate}
          onChange={e => onStartDateChange(e.target.value)}
          min={minStartDate}
          placeholder="Select start date"
          disabled={isDisabled}
        />
        {startDateError && (
          <Text fontSize="sm" color="red.500" mt={1}>
            {startDateError}
          </Text>
        )}
      </Box>

      <Box>
        <Text fontSize="md" fontWeight="medium" mb={3}>
          Return Date
        </Text>
        <FormInput
          type="date"
          value={endDate}
          onChange={e => onEndDateChange(e.target.value)}
          min={startDate || minStartDate}
          max={maxEndDate || undefined}
          placeholder="Select return date"
          disabled={!startDate || isDisabled}
        />
        {endDateError && (
          <Text fontSize="sm" color="red.500" mt={1}>
            {endDateError}
          </Text>
        )}
        {startDate && maxEndDate && !isDisabled && (
          <Text fontSize="xs" color="secondaryText.500" mt={1}>
            Maximum borrow period is 30 days (from {startDate} to {maxEndDate})
          </Text>
        )}
      </Box>
    </VStack>
  );
}
