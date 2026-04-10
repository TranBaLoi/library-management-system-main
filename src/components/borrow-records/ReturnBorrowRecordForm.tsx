'use client';

import { Button, FormButtons, FormDivider, Table, Tag } from '@/components';
import { BookCell } from '@/components/books/BookCell';
import { RecordViolationDialog } from '@/components/borrow-records/RecordViolationDialog';
import { BorrowRecordStatusCell } from '@/components/table/borrow-record/BorrowRecordStatusCell';
import { policyIdToCondition, VIOLATION_POLICY_POINTS } from '@/constants';
import { useReturnBorrowRecordForm, useViolationPolicies } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { BookItemForViolation, BorrowRecordWithDetails, BorrowStatus } from '@/types/borrow-record';
import { Box, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import { useMemo, useState } from 'react';

export function ReturnBorrowRecordForm({
  borrowRecord,
  onClose,
  onSuccess,
  readOnly = false,
  onReturnClick,
}: {
  borrowRecord: BorrowRecordWithDetails;
  onClose: () => void;
  onSuccess?: () => void;
  readOnly?: boolean;
  onReturnClick?: () => void;
}) {
  const {
    isSubmitting,
    pendingViolations,
    violationDialogOpen,
    selectedBookItem,
    items,
    tableData,
    columns,
    totalViolationAmount,
    totalViolationPoints,
    selectedBookItemNewCondition,
    initialViolationData,
    handleViolationConfirm,
    handleViewViolation,
    handleSubmit,
    handleCloseViolationDialog,
    getViolationPolicyInfo,
  } = useReturnBorrowRecordForm({
    borrowRecord,
    onSuccess,
    readOnly,
  });

  // Get violation policies for readOnly mode
  const { violationPolicies } = useViolationPolicies();

  // State for view violation dialog in readOnly mode
  const [viewViolationDialogOpen, setViewViolationDialogOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<{
    id: number;
    policyId: string;
    amount: number;
    isPaid: boolean;
    paidAt: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    policy?: {
      id: string;
      name: string;
    };
  } | null>(null);
  const [selectedBookItemForDialog, setSelectedBookItemForDialog] =
    useState<BookItemForViolation | null>(null);

  // Calculate totals from payments in readOnly mode
  const { totalPaymentAmount, totalPaymentPoints } = useMemo(() => {
    if (!readOnly || !borrowRecord.payments) {
      return { totalPaymentAmount: 0, totalPaymentPoints: 0 };
    }

    const totalAmount = borrowRecord.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const totalPoints = borrowRecord.payments.reduce((sum, payment) => {
      const points =
        violationPolicies?.[payment.policyId]?.points ||
        VIOLATION_POLICY_POINTS[payment.policyId] ||
        0;
      return sum + points;
    }, 0);

    return { totalPaymentAmount: totalAmount, totalPaymentPoints: totalPoints };
  }, [readOnly, borrowRecord.payments, violationPolicies]);

  // Handle view violation in readOnly mode
  const handleViewViolationInReadOnly = (payment: {
    id: number;
    policyId: string;
    amount: number;
    isPaid: boolean;
    paidAt: Date | null;
    dueDate: Date | null;
    createdAt: Date;
    policy?: {
      id: string;
      name: string;
    };
  }) => {
    const condition = policyIdToCondition(payment.policyId);
    const matchingBookItem = items.find(bb => bb.bookItem.condition === condition)?.bookItem;

    // If no matching condition, use first bookItem
    const selectedBookItem = matchingBookItem || items[0]?.bookItem;

    if (selectedBookItem) {
      setSelectedBookItemForDialog({
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

    setSelectedPayment(payment);
    setViewViolationDialogOpen(true);
  };

  // Handle close view violation dialog
  const handleCloseViewViolationDialog = () => {
    setViewViolationDialogOpen(false);
    setSelectedPayment(null);
    setSelectedBookItemForDialog(null);
  };

  return (
    <>
      <Stack
        as={readOnly ? 'div' : 'form'}
        onSubmit={readOnly ? undefined : handleSubmit}
        height="100%"
        gap={0}
        px={1}
      >
        <Box flex="1" overflowY="auto">
          <Stack gap={4} py={4}>
            <VStack align="stretch" gap={2}>
              <Text fontWeight="bold">Borrow Record ID: {borrowRecord.id}</Text>
              <HStack gap={4} flexWrap="wrap" fontSize="sm">
                <Text>
                  <b>Borrower:</b> {borrowRecord.user?.fullName}
                </Text>
                <Text>
                  <b>Email:</b> {borrowRecord.user?.email}
                </Text>
                <Text>
                  <b>Borrow Date:</b> {formatDate(borrowRecord.borrowDate)}
                </Text>
                <Text>
                  <b>Expected Return:</b> {formatDate(borrowRecord.returnDate)}
                </Text>
                {readOnly && borrowRecord.actualReturnDate && (
                  <Text>
                    <b>Actual Return:</b> {formatDate(borrowRecord.actualReturnDate)}
                  </Text>
                )}
                <Text>
                  <b>Renewals:</b> {borrowRecord.renewalCount || 0}
                </Text>
                <HStack>
                  <Text>
                    <b>Status:</b>
                  </Text>
                  <BorrowRecordStatusCell status={borrowRecord.status} />
                </HStack>
              </HStack>
            </VStack>

            <FormDivider />

            {items.length > 0 && (
              <>
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    Books to Return ({items.length})
                  </Text>
                  {!readOnly && (
                    <Text fontSize="sm" color="secondaryText.500" mb={4}>
                      Review and update condition for each book item if needed
                    </Text>
                  )}
                  <Table
                    columns={columns}
                    data={tableData}
                    page={1}
                    pageSize={10}
                    total={tableData.length}
                    loading={false}
                    hidePageSizeSelect
                  />
                </Box>

                <FormDivider />
              </>
            )}

            {/* Ebooks in this borrow record (read-only display) */}
            {readOnly && borrowRecord.borrowEbooks && borrowRecord.borrowEbooks.length > 0 && (
              <>
                <Box>
                  <Text fontWeight="semibold" mb={3}>
                    Ebooks ({borrowRecord.borrowEbooks.length})
                  </Text>
                  <VStack align="stretch" gap={3}>
                    {borrowRecord.borrowEbooks.map(ebook => (
                      <Box
                        key={ebook.book.id}
                        p={3}
                        borderRadius="md"
                        border="1px solid"
                        borderColor="gray.200"
                        bg="white"
                      >
                        <BookCell
                          title={ebook.book.title}
                          coverImageUrl={ebook.book.coverImageUrl}
                          authorName={ebook.book.author?.fullName || ''}
                          isbn={ebook.book.isbn}
                          publishYear={ebook.book.publishYear}
                        />
                      </Box>
                    ))}
                  </VStack>
                </Box>
              </>
            )}

            {/* Violation Summary*/}
            {((!readOnly && Object.keys(pendingViolations).length > 0) ||
              (readOnly && borrowRecord.payments && borrowRecord.payments.length > 0)) && (
              <Box>
                <FormDivider />
                <VStack align="stretch" gap={3}>
                  <HStack>
                    <Text fontWeight="semibold" fontSize="md">
                      {readOnly
                        ? `Violations (${borrowRecord.payments?.length || 0})`
                        : `Recorded Violations (${Object.keys(pendingViolations).length})`}
                    </Text>
                  </HStack>

                  <VStack align="stretch" gap={2}>
                    {readOnly && borrowRecord.payments
                      ? borrowRecord.payments.map(payment => {
                          const condition = policyIdToCondition(payment.policyId);
                          const bookItem = items.find(
                            bb => bb.bookItem.condition === condition
                          )?.bookItem;
                          const policyName = payment.policy?.name || 'Unknown';
                          return (
                            <Box
                              key={payment.id}
                              p={3}
                              bg="white"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="primary.500"
                            >
                              <HStack justify="space-between" align="start">
                                <VStack align="start" gap={1} flex="1">
                                  <Box
                                    width="100%"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <HStack>
                                      <Text fontWeight="medium" fontSize="sm">
                                        {bookItem?.code || 'N/A'}
                                      </Text>
                                      {bookItem?.book?.title && (
                                        <>
                                          <Text fontSize="sm">-</Text>
                                          <Text fontSize="sm">{bookItem.book.title}</Text>
                                        </>
                                      )}
                                    </HStack>
                                  </Box>
                                  <Box
                                    width="100%"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <HStack gap={2}>
                                      <Text fontSize="sm" color="secondaryText.500">
                                        {policyName} - {payment.amount.toLocaleString('vi-VN')} VND
                                      </Text>
                                      <Tag
                                        variantType={payment.isPaid ? 'active' : 'inactive'}
                                        fontSize="xs"
                                      >
                                        {payment.isPaid ? 'Paid' : 'Unpaid'}
                                      </Tag>
                                    </HStack>
                                    <Text
                                      fontSize="sm"
                                      cursor="pointer"
                                      textDecoration="underline"
                                      onClick={() => handleViewViolationInReadOnly(payment)}
                                    >
                                      View Detail
                                    </Text>
                                  </Box>
                                </VStack>
                              </HStack>
                            </Box>
                          );
                        })
                      : Object.values(pendingViolations).map(violation => {
                          const bookItem = items.find(
                            bb => bb.bookItem.id === violation.bookItemId
                          )?.bookItem;
                          const policyInfo = getViolationPolicyInfo(violation.policyId);
                          return (
                            <Box
                              key={violation.bookItemId}
                              p={3}
                              bg="white"
                              borderRadius="md"
                              border="1px solid"
                              borderColor="primary.500"
                            >
                              <HStack justify="space-between" align="start">
                                <VStack align="start" gap={1} flex="1">
                                  <Box
                                    width="100%"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <HStack>
                                      <Text fontWeight="medium" fontSize="sm">
                                        {bookItem?.code}
                                      </Text>
                                      <Text fontSize="sm">-</Text>
                                      <Text fontSize="sm">{bookItem?.book?.title || 'N/A'}</Text>
                                    </HStack>
                                  </Box>
                                  <Box
                                    width="100%"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="space-between"
                                  >
                                    <Text fontSize="sm" color="secondaryText.500">
                                      {policyInfo.name} - {violation.amount.toLocaleString('vi-VN')}{' '}
                                      VND
                                    </Text>
                                    <Text
                                      fontSize="sm"
                                      cursor="pointer"
                                      textDecoration="underline"
                                      onClick={() => handleViewViolation(violation)}
                                    >
                                      View Detail
                                    </Text>
                                  </Box>
                                </VStack>
                              </HStack>
                            </Box>
                          );
                        })}
                  </VStack>

                  <Box borderRadius="md" width="fit-content">
                    <HStack justify="space-between">
                      <Text fontWeight="medium" fontSize="sm">
                        Total Penalty:
                      </Text>
                      <Text fontWeight="bold" fontSize="sm">
                        {(readOnly ? totalPaymentAmount : totalViolationAmount).toLocaleString(
                          'vi-VN'
                        )}{' '}
                        VND
                      </Text>
                    </HStack>
                    <HStack justify="space-between" mt={1}>
                      <Text fontWeight="medium" fontSize="sm">
                        Total Violation Points:
                      </Text>
                      <Text fontWeight="bold" fontSize="sm">
                        +{readOnly ? totalPaymentPoints : totalViolationPoints} points
                      </Text>
                    </HStack>
                  </Box>
                </VStack>
              </Box>
            )}
          </Stack>
        </Box>

        <Box>
          {readOnly ? (
            <HStack justifyContent="flex-end" py={4} gap={2}>
              {onReturnClick &&
                borrowRecord.status === BorrowStatus.BORROWED &&
                !borrowRecord.actualReturnDate && (
                  <Button onClick={onReturnClick} variantType="primary" label="Process Return" />
                )}
              <Button onClick={onClose} variantType="secondary" label="Close" />
            </HStack>
          ) : (
            <FormButtons
              submitLabel="Confirm Return"
              cancelLabel="Cancel"
              isSubmitting={isSubmitting}
              onCancel={onClose}
            />
          )}
        </Box>
      </Stack>

      {/* Violation Dialog */}
      {!readOnly && selectedBookItem && (
        <RecordViolationDialog
          isOpen={violationDialogOpen}
          onClose={handleCloseViolationDialog}
          onConfirm={handleViolationConfirm}
          borrowRecord={borrowRecord}
          bookItem={selectedBookItem}
          newCondition={selectedBookItemNewCondition}
          initialViolation={initialViolationData}
        />
      )}

      {/* View Violation Dialog */}
      {readOnly &&
        viewViolationDialogOpen &&
        borrowRecord &&
        selectedBookItemForDialog &&
        selectedPayment && (
          <RecordViolationDialog
            isOpen={viewViolationDialogOpen}
            onClose={handleCloseViewViolationDialog}
            borrowRecord={borrowRecord}
            bookItem={selectedBookItemForDialog}
            newCondition={selectedBookItemForDialog.condition || ''}
            initialViolation={{
              amount: selectedPayment.amount,
              dueDate: selectedPayment.dueDate
                ? new Date(selectedPayment.dueDate).toISOString().split('T')[0]
                : undefined,
            }}
            viewOnly={true}
            payment={{
              id: selectedPayment.id,
              policyId: selectedPayment.policyId,
              borrowRecordId: borrowRecord.id,
              amount: selectedPayment.amount,
              isPaid: selectedPayment.isPaid,
              paidAt: selectedPayment.paidAt,
              dueDate: selectedPayment.dueDate,
              createdAt: selectedPayment.createdAt,
              updatedAt: selectedPayment.createdAt,
              isDeleted: false,
              policy: selectedPayment.policy,
            }}
          />
        )}
    </>
  );
}
