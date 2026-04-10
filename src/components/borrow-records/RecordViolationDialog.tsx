'use client';

import { Dialog, FormField, FormInput, Tag } from '@/components';
import { DEFAULT_VIOLATION_DUE_DATE_DAYS } from '@/constants';
import { useViolationPolicyByCondition } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { PaymentWithDetails } from '@/types';
import { BookItemForViolation, BorrowRecordWithDetails } from '@/types/borrow-record';
import { Violation } from '@/types/violation';
import { Box, Grid, GridItem, HStack, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState } from 'react';

interface RecordViolationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (violation: Violation) => void;
  borrowRecord: BorrowRecordWithDetails;
  bookItem: BookItemForViolation | null;
  newCondition: string;
  initialViolation?: { amount: number; dueDate?: string };
  viewOnly?: boolean;
  payment?: PaymentWithDetails;
}

export function RecordViolationDialog({
  isOpen,
  onClose,
  onConfirm,
  borrowRecord,
  bookItem,
  newCondition,
  initialViolation,
  viewOnly = false,
  payment,
}: RecordViolationDialogProps) {
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>('');

  // Get violation policy from database
  const policy = useViolationPolicyByCondition(newCondition);

  useEffect(() => {
    if (bookItem && newCondition && policy) {
      const bookPrice = bookItem.book?.price || 0;
      const suggestedAmount = Math.floor((bookPrice * policy.penaltyPercent) / 100);
      // Use initial amount if provided (when editing), otherwise use suggested amount
      setAmount(initialViolation?.amount || suggestedAmount);

      // Set default due date (3 days from today) if not provided
      if (initialViolation?.dueDate) {
        setDueDate(initialViolation.dueDate);
      } else {
        const defaultDueDate = new Date();
        defaultDueDate.setDate(defaultDueDate.getDate() + DEFAULT_VIOLATION_DUE_DATE_DAYS);
        setDueDate(defaultDueDate.toISOString().split('T')[0]);
      }
    }
  }, [bookItem, newCondition, initialViolation, policy]);

  const bookPrice = bookItem?.book?.price || 0;

  if (!bookItem || !policy) {
    return null;
  }

  const handleConfirm = () => {
    if (viewOnly || !onConfirm) {
      return;
    }
    if (amount <= 0) {
      return;
    }
    if (!dueDate) {
      return;
    }
    onConfirm({
      bookItemId: bookItem.id,
      policyId: policy.id,
      amount,
      dueDate,
    });
    handleClose();
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title={viewOnly ? 'View Violation' : 'Record Violation'}
      maxW="800px"
      content={
        <VStack gap={6} align="stretch">
          {/* Borrower Information */}
          <Box>
            <Text fontWeight="semibold" mb={3} fontSize="md">
              Borrower
            </Text>
            <VStack align="start" gap={2} fontSize="sm">
              <HStack>
                <Text fontWeight="medium">Name:</Text>
                <Text>{borrowRecord.user?.fullName || 'N/A'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Email:</Text>
                <Text>{borrowRecord.user?.email || 'N/A'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Current Violation Points:</Text>
                <Text>{borrowRecord.user?.violationPoints || 0} points</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Book Information */}
          <Box>
            <Text fontWeight="semibold" mb={3} fontSize="md">
              Violated Book
            </Text>
            <VStack align="start" gap={2} fontSize="sm">
              <HStack>
                <Text fontWeight="medium">Book Title:</Text>
                <Text>{bookItem.book?.title || 'N/A'}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Book Copy Code:</Text>
                <Text>{bookItem.code}</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Price:</Text>
                <Text>{bookPrice.toLocaleString('vi-VN')} VND</Text>
              </HStack>
              <HStack>
                <Text fontWeight="medium">Borrow Record ID:</Text>
                <Text>{borrowRecord.id}</Text>
              </HStack>
            </VStack>
          </Box>

          {/* Violation Information */}
          <Box>
            <Text fontWeight="semibold" mb={3} fontSize="md">
              Violation Information
            </Text>
            <Grid templateColumns="repeat(2, 1fr)" gap={3}>
              <GridItem>
                <FormField label="Violation Type" fontSize="sm" width="100%">
                  <FormInput value={policy?.name} fontSize="sm" height="40px" disabled />
                </FormField>
              </GridItem>

              <GridItem>
                <FormField label="Violation Fee" fontSize="sm" width="100%">
                  <FormInput
                    type="text"
                    fontSize="sm"
                    value={amount.toLocaleString('vi-VN') + ' VND'}
                    height="40px"
                    disabled
                  />
                </FormField>
              </GridItem>

              <GridItem>
                <FormField label="Violation Points" fontSize="sm" width="100%">
                  <FormInput
                    value={`+${policy.points} points`}
                    fontSize="sm"
                    height="40px"
                    disabled
                  />
                </FormField>
              </GridItem>

              <GridItem>
                <FormField label="Due Date" fontSize="sm" width="100%">
                  <FormInput
                    type="date"
                    fontSize="sm"
                    height="40px"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    min={new Date().toISOString().split('T')[0]}
                    placeholder="Select due date"
                    disabled={viewOnly}
                  />
                </FormField>
              </GridItem>
            </Grid>
          </Box>

          {/* Payment Information - Only show in viewOnly mode */}
          {viewOnly && payment && (
            <Box>
              <Text fontWeight="semibold" mb={3} fontSize="md">
                Payment Information
              </Text>
              <VStack align="start" gap={2} fontSize="sm">
                <HStack>
                  <Text fontWeight="medium">Payment ID:</Text>
                  <Text>{payment.id}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="medium">Status:</Text>
                  <Tag variantType={payment.isPaid ? 'active' : 'inactive'}>
                    {payment.isPaid ? 'Paid' : 'Unpaid'}
                  </Tag>
                </HStack>
                {payment.isPaid && payment.paidAt && (
                  <HStack>
                    <Text fontWeight="medium">Paid At:</Text>
                    <Text>{formatDate(payment.paidAt)}</Text>
                  </HStack>
                )}
                <HStack>
                  <Text fontWeight="medium">Created At:</Text>
                  <Text>{formatDate(payment.createdAt)}</Text>
                </HStack>
              </VStack>
            </Box>
          )}
        </VStack>
      }
      buttons={
        viewOnly
          ? [
              {
                label: 'Close',
                variant: 'primary',
                onClick: handleClose,
              },
            ]
          : [
              {
                label: 'Cancel',
                variant: 'secondary',
                onClick: handleClose,
              },
              {
                label: 'Confirm',
                variant: 'primary',
                onClick: handleConfirm,
              },
            ]
      }
    />
  );
}
