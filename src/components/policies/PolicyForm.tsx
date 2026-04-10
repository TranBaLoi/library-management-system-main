'use client';

import { Dialog, FormButtons, FormField, FormInput, FormSelect } from '@/components';
import { usePolicyForm } from '@/lib/hooks';
import { Box, Grid, GridItem, Stack } from '@chakra-ui/react';

interface PolicyFormProps {
  policyId?: string;
  submitLabel?: string;
  cancelLabel?: string;
}

export function PolicyForm({
  policyId,
  submitLabel = 'Save Policy',
  cancelLabel = 'Cancel',
}: PolicyFormProps) {
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
  } = usePolicyForm(policyId);

  return (
    <Box
      as="form"
      onSubmit={handleSubmit}
      p={4}
      paddingBottom={0}
      display="flex"
      flexDirection="column"
      height="100%"
    >
      <Stack gap={3} flex={1}>
        {/* Policy ID */}
        <FormField label="Policy ID" error={errors.id}>
          <FormInput
            value={form.id}
            onChange={e => setField('id', e.target.value)}
            placeholder="Enter policy ID"
            disabled={!!policyId || isSubmitting}
          />
        </FormField>

        {/* Policy Name */}
        <FormField label="Policy Name" error={errors.name}>
          <FormInput
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Enter policy name"
            disabled={isSubmitting}
          />
        </FormField>

        <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
          <GridItem>
            {/* Amount */}
            <FormField label="Amount" error={errors.amount}>
              <FormInput
                type="number"
                value={form.amount}
                onChange={e => setField('amount', e.target.value)}
                placeholder={form.unit === 'FIXED' ? 'Enter percentage' : 'Enter amount in VND'}
                step={form.unit === 'FIXED' ? '1' : '0.01'}
                disabled={isSubmitting}
              />
            </FormField>
          </GridItem>

          <GridItem>
            {/* Unit */}
            <FormField label="Unit" error={errors.unit}>
              <FormSelect
                items={[
                  { label: 'Fixed (% of book value)', value: 'FIXED' },
                  { label: 'Per Day (VND/day)', value: 'PER_DAY' },
                ]}
                value={form.unit}
                onChange={value => {
                  const newUnit = value as 'FIXED' | 'PER_DAY';
                  setField('unit', newUnit);
                  // Auto-set amount to 100 when switching to FIXED
                  if (newUnit === 'FIXED') {
                    setField('amount', '100');
                  }
                }}
                placeholder="Select unit"
                height="50px"
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
      </Stack>

      {/* Buttons */}
      <Box>
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
    </Box>
  );
}
