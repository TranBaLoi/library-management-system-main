'use client';

import {
  BookItemsTable,
  Dialog,
  FormButtons,
  FormDivider,
  FormField,
  FormSelectSearch,
  SelectableCheckbox,
  Spinner,
} from '@/components';
import { createBookItemDetailColumns } from '@/components/table/book/BookItemDetailColumns';
import { useBorrowRecordForm, useMe } from '@/lib/hooks';
import { formatDate } from '@/lib/utils';
import { BookItemWithBook, Column } from '@/types';
import { Box, Flex, HStack, Stack, Text, VStack } from '@chakra-ui/react';
import { useMemo } from 'react';

interface BorrowRecordFormProps {
  submitLabel?: string;
  cancelLabel?: string;
}

// Component for each book items table with checkbox
interface BookItemsTableWithCheckboxProps {
  requestId: number;
  bookId: number;
  bookTitle: string;
  canSelectMore: boolean;
  isBookItemSelected: (requestId: number, bookId: number, bookItemId: number) => boolean;
  onBookItemToggle: (
    requestId: number,
    bookId: number,
    bookItemId: number,
    bookTitle: string
  ) => void;
  baseColumnsWithoutActions: Column<BookItemWithBook>[];
}

/**
 * Helper function to create a checkbox column for book items table
 */
function createCheckboxColumn(
  requestId: number,
  bookId: number,
  bookTitle: string,
  canSelectMore: boolean,
  isBookItemSelected: (requestId: number, bookId: number, bookItemId: number) => boolean,
  onBookItemToggle: (
    requestId: number,
    bookId: number,
    bookItemId: number,
    bookTitle: string
  ) => void
): Column<BookItemWithBook> {
  return {
    key: 'checkbox',
    header: '',
    sortable: false,
    width: '40px',
    textAlign: 'center',
    render: (bookItem: BookItemWithBook) => (
      <SelectableCheckbox
        requestId={requestId}
        bookId={bookId}
        bookItemId={bookItem.id}
        bookTitle={bookTitle}
        canSelectMore={canSelectMore}
        isBookItemSelected={isBookItemSelected}
        onBookItemToggle={onBookItemToggle}
      />
    ),
  };
}

/**
 * Helper function to insert checkbox column before the 'code' column
 */
function insertCheckboxColumn(
  columns: Column<BookItemWithBook>[],
  checkboxColumn: Column<BookItemWithBook>
): Column<BookItemWithBook>[] {
  const codeIndex = columns.findIndex(col => col.key === 'code');
  if (codeIndex >= 0) {
    columns.splice(codeIndex, 0, checkboxColumn);
  } else {
    columns.unshift(checkboxColumn);
  }
  return columns;
}

function BookItemsTableWithCheckbox({
  requestId,
  bookId,
  bookTitle,
  canSelectMore,
  isBookItemSelected,
  onBookItemToggle,
  baseColumnsWithoutActions,
}: BookItemsTableWithCheckboxProps) {
  const columns = useMemo(() => {
    // Create new array to avoid mutating the base
    const columns = [...baseColumnsWithoutActions];

    // Create checkbox column using functions directly
    const checkboxColumn = createCheckboxColumn(
      requestId,
      bookId,
      bookTitle,
      canSelectMore,
      isBookItemSelected,
      onBookItemToggle
    );

    // Insert checkbox column before code column
    return insertCheckboxColumn(columns, checkboxColumn);
  }, [
    requestId,
    bookId,
    bookTitle,
    canSelectMore,
    baseColumnsWithoutActions,
    isBookItemSelected,
    onBookItemToggle,
  ]);

  const initialFilters = useMemo(
    () => ({
      bookIds: [bookId],
      statuses: ['AVAILABLE'] as string[],
    }),
    [bookId]
  );

  const bookIdsArray = useMemo(() => [bookId], [bookId]);

  return (
    <BookItemsTable
      columns={columns}
      bookIds={bookIdsArray}
      searchPlaceholder="Search book copies by code"
      showFilter={false}
      showAddButton={false}
      searchByCodeOnly={true}
      showHeader={false}
      maxHeight="400px"
      initialFilters={initialFilters}
    />
  );
}

export function BorrowRecordForm({
  submitLabel = 'Create Borrow Record',
  cancelLabel = 'Cancel',
}: BorrowRecordFormProps) {
  const {
    selectedUserId,
    borrowRequests,
    loadingRequests,
    isSubmitting,
    bookItemsMap,
    userOptions,
    handleUserChange,
    handleBookItemSelection,
    isBookItemSelected,
    getQuantitySelected,
    handleSubmit,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  } = useBorrowRecordForm();

  const { data: user } = useMe();
  const isAdminOrLibrarian = user?.role === 'ADMIN' || user?.role === 'LIBRARIAN';

  const baseColumns = useMemo(
    () => createBookItemDetailColumns(isAdminOrLibrarian),
    [isAdminOrLibrarian]
  );
  const baseColumnsWithoutActions = useMemo(
    () =>
      baseColumns.filter(
        col => col.key !== 'actions' && col.key !== 'condition'
      ) as Column<BookItemWithBook>[],
    [baseColumns]
  );

  return (
    <Flex
      as="form"
      onSubmit={handleSubmit}
      direction="column"
      h="100%"
      minH="calc(100vh - 200px)"
      px={4}
      py={2}
    >
      <Stack gap={4} flex="1">
        {/* Section 1: User Selection */}
        <FormField label="Select Reader">
          <FormSelectSearch
            value={
              selectedUserId
                ? userOptions.find(opt => opt.value === selectedUserId.toString())
                : undefined
            }
            onChange={handleUserChange}
            options={userOptions}
            placeholder="Select a reader..."
            isSearchable
            isDisabled={isSubmitting}
          />
        </FormField>

        {selectedUserId && (
          <>
            <FormDivider />

            {/* Section 2: Borrow Requests */}
            {loadingRequests ? (
              <Box
                display="flex"
                flexDirection="column"
                alignItems="center"
                justifyContent="center"
                gap={4}
              >
                <Spinner />
                <Text color="secondaryText.500">Loading borrow requests...</Text>
              </Box>
            ) : borrowRequests.length === 0 ? (
              <Text color="gray.500">No approved borrow requests found for this user.</Text>
            ) : (
              <VStack gap={6} align="stretch">
                <Text fontSize="lg" fontWeight="bold">
                  Approved Borrow Requests
                </Text>

                {borrowRequests.map(request => (
                  <Box key={request.id}>
                    <VStack gap={3} align="stretch">
                      {request.items.map(item => {
                        const bookItems = bookItemsMap.get(item.bookId) || [];
                        const quantityNeeded = item.quantity;
                        const quantitySelected = getQuantitySelected(request.id, item.bookId);
                        const canSelectMore = quantitySelected < quantityNeeded;

                        return (
                          <Box
                            key={`${request.id}-${item.bookId}`}
                            p={4}
                            bg="gray.50"
                            borderRadius="md"
                          >
                            <HStack justify="space-between" mb={3}>
                              <Text fontWeight="semibold">Request #{request.id}</Text>
                              <Text fontSize="sm" color="gray.600">
                                Created: {formatDate(request.createdAt)}
                              </Text>
                            </HStack>
                            <VStack gap={2} align="stretch">
                              <HStack justify="space-between">
                                <VStack align="start" gap={1}>
                                  <Text fontWeight="medium">{item.book.title}</Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Author: {item.book.author.fullName}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    ISBN: {item.book.isbn}
                                  </Text>
                                  <Text fontSize="sm" color="gray.600">
                                    Quantity needed: {quantityNeeded}
                                  </Text>
                                  <Text
                                    fontSize="sm"
                                    color={canSelectMore ? 'orange.600' : 'green.600'}
                                  >
                                    Selected: {quantitySelected} / {quantityNeeded}
                                  </Text>
                                </VStack>
                              </HStack>

                              {bookItems.length === 0 ? (
                                <Text fontSize="sm" color="red.500">
                                  No available book items found for this book.
                                </Text>
                              ) : (
                                <Box
                                  borderRadius="lg"
                                  border="1px solid #e5e7eb !important"
                                  mt={4}
                                  p={6}
                                >
                                  <BookItemsTableWithCheckbox
                                    requestId={request.id}
                                    bookId={item.bookId}
                                    bookTitle={item.book.title}
                                    canSelectMore={canSelectMore}
                                    isBookItemSelected={isBookItemSelected}
                                    onBookItemToggle={handleBookItemSelection}
                                    baseColumnsWithoutActions={baseColumnsWithoutActions}
                                  />
                                </Box>
                              )}
                            </VStack>
                          </Box>
                        );
                      })}
                    </VStack>
                  </Box>
                ))}
              </VStack>
            )}
          </>
        )}
      </Stack>

      {/* Buttons - Fixed at bottom */}
      <Box mt="auto" pt={4}>
        <FormButtons
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
        />
      </Box>

      {/* Confirmation Dialog */}
      <Dialog
        isOpen={dialog.isOpen}
        onClose={handleDialogCancel}
        title={dialog.title}
        content={dialog.message}
        buttons={[
          {
            label: dialog.cancelText,
            onClick: handleDialogCancel,
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
    </Flex>
  );
}
