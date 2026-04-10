'use client';

import {
  BookSelectSearch,
  Dialog,
  FormButtons,
  FormDivider,
  FormField,
  FormInput,
  FormSection,
  FormSelect,
} from '@/components';
import { useBookItemForm } from '@/lib/hooks';
import type { BookOption } from '@/lib/hooks/useBooks';
import { Box, Grid, GridItem, Stack } from '@chakra-ui/react';
import { Condition, ItemStatus } from '@prisma/client';

interface BookItemFormProps {
  bookItemId?: number;
  submitLabel?: string;
  cancelLabel?: string;
  bookId?: number;
}

export function BookItemForm({
  bookItemId,
  submitLabel = 'Save Book Copy',
  cancelLabel = 'Cancel',
  bookId,
}: BookItemFormProps) {
  const {
    form,
    errors,
    isSubmitting,
    setField,
    handleSubmit,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  } = useBookItemForm(bookItemId, bookId);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      px={4}
      py={2}
      paddingBottom={0}
      height="100%"
      display="flex"
      flexDirection="column"
    >
      <Stack gap={3} flex="1">
        {/* Section 1: Basic Information */}
        <FormSection title="Basic Information">
          {/* Book Selection */}
          <FormField label="Book" error={errors.bookId}>
            <BookSelectSearch
              value={
                form.bookId
                  ? {
                      value: form.bookId,
                      label: '',
                      title: '',
                      coverImageUrl: null,
                      authorName: '',
                      publishYear: null,
                      isbn: null,
                    }
                  : undefined
              }
              onChange={val => {
                const bookOption = val as BookOption;
                setField('bookId', String(bookOption?.value || ''));
              }}
              placeholder="Select book"
              fontSize="md"
              isDisabled={isSubmitting}
              useLazyLoading={true}
            />
          </FormField>

          {/* Book Copy Code */}
          <FormField label="Book Copy Code" error={errors.code}>
            <FormInput
              value={form.code}
              onChange={e => setField('code', e.target.value)}
              placeholder="Enter book copy code"
              disabled={isSubmitting}
            />
          </FormField>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            <GridItem>
              {/* Condition */}
              <FormField label="Condition" error={errors.condition}>
                <FormSelect
                  items={[
                    { label: 'New', value: 'NEW' },
                    { label: 'Good', value: 'GOOD' },
                    { label: 'Worn', value: 'WORN' },
                    { label: 'Damaged', value: 'DAMAGED' },
                    { label: 'Lost', value: 'LOST' },
                  ]}
                  value={form.condition}
                  onChange={value => setField('condition', value as Condition)}
                  placeholder="Select condition"
                  height="50px"
                  disabled={isSubmitting}
                />
              </FormField>
            </GridItem>

            <GridItem>
              {/* Status */}
              <FormField label="Status" error={errors.status}>
                <FormSelect
                  items={[
                    { label: 'Available', value: 'AVAILABLE' },
                    { label: 'On Borrow', value: 'ON_BORROW' },
                    { label: 'Reserved', value: 'RESERVED' },
                    { label: 'Maintenance', value: 'MAINTENANCE' },
                    { label: 'Retired', value: 'RETIRED' },
                    { label: 'Lost', value: 'LOST' },
                  ]}
                  value={form.status}
                  onChange={value => setField('status', value as ItemStatus)}
                  placeholder="Select status"
                  height="50px"
                  disabled={isSubmitting}
                />
              </FormField>
            </GridItem>
          </Grid>
        </FormSection>

        <FormDivider />

        {/* Section 2: Additional Information */}
        <FormSection title="Additional Information">
          {/* Acquisition Date */}
          <FormField label="Acquisition Date" error={errors.acquisitionDate}>
            <FormInput
              type="date"
              value={form.acquisitionDate}
              onChange={e => setField('acquisitionDate', e.target.value)}
              placeholder="Select acquisition date"
              disabled={isSubmitting}
            />
          </FormField>
        </FormSection>
      </Stack>

      {/* Buttons */}
      <FormButtons
        submitLabel={submitLabel}
        cancelLabel={cancelLabel}
        isSubmitting={isSubmitting}
        onCancel={handleCancel}
      />

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
    </Box>
  );
}
