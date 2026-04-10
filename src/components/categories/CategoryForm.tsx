'use client';

import {
  Dialog,
  FormButtons,
  FormDivider,
  FormField,
  FormInput,
  FormSection,
  FormSelect,
  FormTextarea,
} from '@/components';
import { useCategoryForm } from '@/lib/hooks';
import { Box, Flex, Stack } from '@chakra-ui/react';

interface CategoryFormProps {
  categoryId?: number;
  submitLabel?: string;
  cancelLabel?: string;
}

export function CategoryForm({
  categoryId,
  submitLabel = 'Save Category',
  cancelLabel = 'Cancel',
}: CategoryFormProps) {
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
  } = useCategoryForm(categoryId);

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
      <Stack gap={3} flex="1">
        {/* Section 1: Basic Information */}
        <FormSection title="Basic Information">
          {/* Name */}
          <FormField label="Category Name" error={errors.name}>
            <FormInput
              value={form.name}
              onChange={e => setField('name', e.target.value)}
              placeholder="Enter category name"
              disabled={isSubmitting}
            />
          </FormField>

          {/* Status */}
          <FormField label="Status">
            <FormSelect
              items={[
                { label: 'Active', value: 'false' },
                { label: 'Inactive', value: 'true' },
              ]}
              value={form.isDeleted ? 'true' : 'false'}
              onChange={value => setField('isDeleted', value === 'true')}
              placeholder="Select status"
              height="50px"
              disabled={isSubmitting}
            />
          </FormField>
        </FormSection>

        <FormDivider />

        {/* Section 2: Additional Information */}
        <FormSection title="Additional Information">
          {/* Description */}
          <FormField label="Description" error={errors.description}>
            <FormTextarea
              value={form.description}
              onChange={e => setField('description', e.target.value)}
              placeholder="Enter category description"
              rows={4}
              disabled={isSubmitting}
            />
          </FormField>
        </FormSection>
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
