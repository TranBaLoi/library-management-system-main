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
import { useMe, useUserForm } from '@/lib/hooks';
import { Box, Grid, GridItem, Stack } from '@chakra-ui/react';
import { Role, UserStatus } from '@prisma/client';

interface UserFormProps {
  userId?: number;
  submitLabel?: string;
  cancelLabel?: string;
}

// Role options
const ROLE_OPTIONS = [
  { label: 'Reader', value: Role.READER },
  { label: 'Librarian', value: Role.LIBRARIAN },
  { label: 'Admin', value: Role.ADMIN },
];

// Status options
const STATUS_OPTIONS = [
  { label: 'Active', value: UserStatus.ACTIVE },
  { label: 'Inactive', value: UserStatus.INACTIVE },
];

export function UserForm({
  userId,
  submitLabel = 'Save User',
  cancelLabel = 'Cancel',
}: UserFormProps) {
  const { data: currentUser } = useMe();
  const {
    form,
    errors,
    isSubmitting,
    isEditMode,
    setField,
    handleSubmit,
    handleCancel,
    dialog,
    handleConfirm,
    handleDialogCancel,
  } = useUserForm(userId);

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

          {/* Email */}
          <FormField label="Email" error={errors.email}>
            <FormInput
              type="email"
              value={form.email}
              onChange={e => setField('email', e.target.value)}
              placeholder="Enter email address"
              disabled={isSubmitting}
            />
          </FormField>

          {/* Password - Only show in create mode */}
          {!isEditMode && (
            <>
              <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
                <GridItem>
                  {/* Password */}
                  <FormField label="Password" error={errors.password}>
                    <FormInput
                      type="password"
                      value={form.password}
                      onChange={e => setField('password', e.target.value)}
                      placeholder="Enter password"
                      disabled={isSubmitting}
                    />
                  </FormField>
                </GridItem>

                <GridItem>
                  {/* Confirm Password */}
                  <FormField label="Confirm Password" error={errors.confirmPassword}>
                    <FormInput
                      type="password"
                      value={form.confirmPassword}
                      onChange={e => setField('confirmPassword', e.target.value)}
                      placeholder="Confirm password"
                      disabled={isSubmitting}
                    />
                  </FormField>
                </GridItem>
              </Grid>
            </>
          )}

          {/* Phone Number */}
          <FormField label="Phone Number (Optional)" error={errors.phoneNumber}>
            <FormInput
              type="tel"
              value={form.phoneNumber}
              onChange={e => setField('phoneNumber', e.target.value)}
              placeholder="Enter phone number"
              disabled={isSubmitting}
            />
          </FormField>

          {/* Address */}
          <FormField label="Address (Optional)" error={errors.address}>
            <FormTextarea
              value={form.address}
              onChange={e => setField('address', e.target.value)}
              placeholder="Enter address"
              rows={3}
              disabled={isSubmitting}
            />
          </FormField>
        </FormSection>

        <FormDivider />

        {/* Section 2: Access & Permissions */}
        <FormSection title="Access & Permissions">
          <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
            {!(currentUser?.role === Role.LIBRARIAN && !isEditMode) && (
              <GridItem>
                {/* Role */}
                <FormField label="Role" error={errors.role}>
                  <FormSelect
                    items={ROLE_OPTIONS}
                    value={form.role}
                    onChange={value => setField('role', value as Role)}
                    placeholder="Select role"
                    height="50px"
                    disabled={isSubmitting}
                  />
                </FormField>
              </GridItem>
            )}

            <GridItem>
              {/* Status */}
              <FormField label="Status" error={errors.status}>
                <FormSelect
                  items={STATUS_OPTIONS}
                  value={form.status}
                  onChange={value => setField('status', value as UserStatus)}
                  placeholder="Select status"
                  height="50px"
                  disabled={isSubmitting}
                />
              </FormField>
            </GridItem>
          </Grid>
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
