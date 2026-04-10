'use client';

import { Button, FormField, FormInput, FormSection, LoadingBackdrop } from '@/components';
import { useChangePasswordForm } from '@/lib/hooks';
import { Box, Card, Flex, Stack, Text } from '@chakra-ui/react';
import { RiLockPasswordLine } from 'react-icons/ri';

export default function ChangePasswordPage() {
  const { formData, errors, isSubmitting, handleInputChange, handleSubmit, handleCancel } =
    useChangePasswordForm();

  return (
    <Flex justify="center" align="center" minH="100vh" bg="layoutBg.500" p={4}>
      <Box w="100%" maxW="500px">
        <Card.Root bg="white" borderRadius="lg" boxShadow="lg">
          <Card.Body p={6}>
            {/* Header */}
            <Stack gap={4} mb={6} align="center">
              <Box p={4} bg="primary.200" borderRadius="full" color="primary.500">
                <RiLockPasswordLine size={32} />
              </Box>
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="bold" mb={1}>
                  Change Password
                </Text>
                <Text color="secondaryText.500" fontSize="sm">
                  Enter your current password and choose a new password
                </Text>
              </Box>
            </Stack>

            {/* Form */}
            <Box as="form" onSubmit={handleSubmit}>
              <Stack gap={4}>
                <FormSection title="Password Information">
                  <Stack gap={4} mt={4}>
                    {/* Current Password */}
                    <FormField label="Current Password" error={errors.currentPassword}>
                      <FormInput
                        type="password"
                        value={formData.currentPassword}
                        onChange={e => handleInputChange('currentPassword', e.target.value)}
                        placeholder="Enter current password"
                        disabled={isSubmitting}
                      />
                    </FormField>

                    {/* New Password */}
                    <FormField label="New Password" error={errors.newPassword}>
                      <FormInput
                        type="password"
                        value={formData.newPassword}
                        onChange={e => handleInputChange('newPassword', e.target.value)}
                        placeholder="Enter new password"
                        disabled={isSubmitting}
                      />
                      <Text fontSize="xs" color="secondaryText.500" mt={1}>
                        Must be at least 8 characters with uppercase, lowercase, and number
                      </Text>
                    </FormField>

                    {/* Confirm New Password */}
                    <FormField label="Confirm New Password" error={errors.confirmNewPassword}>
                      <FormInput
                        type="password"
                        value={formData.confirmNewPassword}
                        onChange={e => handleInputChange('confirmNewPassword', e.target.value)}
                        placeholder="Confirm new password"
                        disabled={isSubmitting}
                      />
                    </FormField>
                  </Stack>
                </FormSection>

                {/* Buttons */}
                <Stack gap={3} mt={4}>
                  <Button
                    type="submit"
                    variantType="primary"
                    label={isSubmitting ? 'Changing Password...' : 'Change Password'}
                    disabled={isSubmitting}
                    w="100%"
                  />
                  <Button
                    type="button"
                    variantType="secondary"
                    label="Cancel"
                    onClick={handleCancel}
                    disabled={isSubmitting}
                    w="100%"
                  />
                </Stack>
              </Stack>
            </Box>
          </Card.Body>
        </Card.Root>
      </Box>

      {/* Loading Backdrop */}
      <LoadingBackdrop isLoading={isSubmitting} message="Changing password..." />
    </Flex>
  );
}
