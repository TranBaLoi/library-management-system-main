/**
 * Custom hook for change password form
 * Manages form state, validation, and submission
 */

import { PasswordApi } from '@/api';
import { toaster } from '@/components';
import { ChangePasswordRequest } from '@/types/auth';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

interface ChangePasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

interface ChangePasswordFormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmNewPassword?: string;
}

export function useChangePasswordForm() {
  const router = useRouter();
  const [formData, setFormData] = useState<ChangePasswordFormData>({
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [errors, setErrors] = useState<ChangePasswordFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle input change
  const handleInputChange = useCallback(
    (field: keyof ChangePasswordFormData, value: string) => {
      setFormData(prev => ({ ...prev, [field]: value }));
      // Clear error when user starts typing
      if (errors[field]) {
        setErrors(prev => ({ ...prev, [field]: undefined }));
      }
    },
    [errors]
  );

  // Validate form
  const validate = useCallback((): boolean => {
    const newErrors: ChangePasswordFormErrors = {};

    // Current password validation
    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required';
    }

    // New password validation
    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (formData.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    } else if (!/(?=.*[a-z])/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one lowercase letter';
    } else if (!/(?=.*[A-Z])/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one uppercase letter';
    } else if (!/(?=.*\d)/.test(formData.newPassword)) {
      newErrors.newPassword = 'Password must contain at least one number';
    } else if (formData.newPassword === formData.currentPassword) {
      newErrors.newPassword = 'New password must be different from current password';
    }

    // Confirm password validation
    if (!formData.confirmNewPassword) {
      newErrors.confirmNewPassword = 'Please confirm your new password';
    } else if (formData.confirmNewPassword !== formData.newPassword) {
      newErrors.confirmNewPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Validate form
      if (!validate()) {
        return;
      }

      setIsSubmitting(true);

      try {
        const data: ChangePasswordRequest = {
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
          confirmNewPassword: formData.confirmNewPassword,
        };

        await PasswordApi.changePassword(data);

        toaster.create({
          title: 'Success',
          description: 'Password changed successfully',
          type: 'success',
          duration: 3000,
        });

        // Reset form
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmNewPassword: '',
        });

        // Navigate back or to profile after a short delay
        setTimeout(() => {
          router.back();
        }, 1000);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to change password';
        toaster.create({
          title: 'Failed',
          description: message,
          type: 'error',
          duration: 5000,
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [formData, validate, router]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    router.back();
  }, [router]);

  return {
    formData,
    errors,
    isSubmitting,
    handleInputChange,
    handleSubmit,
    handleCancel,
  };
}
