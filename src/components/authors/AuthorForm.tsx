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
import { useAuthorForm } from '@/lib/hooks';
import { Box, Grid, GridItem, Stack } from '@chakra-ui/react';

interface AuthorFormProps {
  authorId?: number;
  submitLabel?: string;
  cancelLabel?: string;
}

export function AuthorForm({
  authorId,
  submitLabel = 'Save Author',
  cancelLabel = 'Cancel',
}: AuthorFormProps) {
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
  } = useAuthorForm(authorId);

  return (
    <Box as="form" onSubmit={handleSubmit} px={4} py={2} paddingBottom={0}>
      <Stack gap={3}>
        {/* Section 1: Basic Information */}
        <FormSection title="Basic Information">
          {/* Full Name */}
          <FormField label="Full Name" error={errors.fullName}>
            <FormInput
              value={form.fullName}
              onChange={e => setField('fullName', e.target.value)}
              placeholder="Enter full name"
              disabled={isSubmitting}
            />
          </FormField>

          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            <GridItem>
              {/* Birth Date */}
              <FormField label="Birth Date" error={errors.birthDate}>
                <FormInput
                  type="date"
                  value={form.birthDate}
                  onChange={e => setField('birthDate', e.target.value)}
                  placeholder="Select birth date"
                  disabled={isSubmitting}
                />
              </FormField>
            </GridItem>

            <GridItem>
              {/* Nationality */}
              <FormField label="Nationality" error={errors.nationality}>
                <FormInput
                  value={form.nationality}
                  onChange={e => setField('nationality', e.target.value)}
                  placeholder="Enter nationality"
                  disabled={isSubmitting}
                />
              </FormField>
            </GridItem>
          </Grid>

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
          {/* Bio */}
          <FormField label="Bio" error={errors.bio}>
            <FormTextarea
              value={form.bio}
              onChange={e => setField('bio', e.target.value)}
              placeholder="Enter author biography"
              rows={4}
              disabled={isSubmitting}
            />
          </FormField>
        </FormSection>

        {/* Buttons */}
        <FormButtons
          submitLabel={submitLabel}
          cancelLabel={cancelLabel}
          isSubmitting={isSubmitting}
          onCancel={handleCancel}
        />
      </Stack>

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
