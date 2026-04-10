/**
 * Forgot Password Page
 * Multi-step form for password reset flow:
 * 1. Enter email and send OTP
 * 2. Verify OTP code
 * 3. Reset password
 */

'use client';

import { OTPApi, PasswordApi } from '@/api';
import { Button } from '@/components/buttons';
import { FormField, FormInput } from '@/components/forms';
import { LoadingBackdrop, toaster } from '@/components/ui';
import { ROUTES } from '@/constants';
import { Box, Heading, HStack, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

// #region Types

interface ForgotPasswordForm {
  email: string;
  otp: string;
  newPassword: string;
  confirmPassword: string;
}

type Step = 1 | 2 | 3;

// #endregion

// #region Component

export default function ForgotPasswordPage() {
  const router = useRouter();

  // State
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<ForgotPasswordForm>({
    email: '',
    otp: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState<Partial<ForgotPasswordForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpExpiresIn, setOtpExpiresIn] = useState<number>(0);

  // Helper to update form field
  const setField = (key: keyof ForgotPasswordForm, value: string) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => ({ ...prev, [key]: undefined }));
    }
  };

  // #region Step 1: Send OTP

  const validateStep1 = (): boolean => {
    const newErrors: Partial<ForgotPasswordForm> = {};

    if (!form.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = 'Invalid email format';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSendOTP = async () => {
    if (!validateStep1()) return;

    setIsSubmitting(true);
    try {
      const response = await OTPApi.sendOTPForPasswordReset(form.email);

      toaster.create({
        title: 'Success',
        description: 'OTP code sent to your email',
        type: 'success',
        duration: 5000,
      });

      setOtpExpiresIn(response.expiresIn);
      setStep(2);
    } catch (error) {
      toaster.create({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to send OTP',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // #endregion

  // #region Step 2: Verify OTP

  const validateStep2 = (): boolean => {
    const newErrors: Partial<ForgotPasswordForm> = {};

    if (!form.otp.trim()) {
      newErrors.otp = 'OTP code is required';
    } else if (!/^\d{6}$/.test(form.otp.trim())) {
      newErrors.otp = 'OTP must be 6 digits';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleVerifyOTP = async () => {
    if (!validateStep2()) return;

    setIsSubmitting(true);
    try {
      const response = await OTPApi.verifyOTPForPasswordReset({
        email: form.email,
        code: form.otp,
      });

      if (response.success) {
        toaster.create({
          title: 'Success',
          description: 'OTP verified successfully',
          type: 'success',
          duration: 3000,
        });

        setStep(3);
      } else {
        toaster.create({
          title: 'Failed',
          description: response.message || 'Invalid OTP code',
          type: 'error',
          duration: 5000,
        });
      }
    } catch (error) {
      toaster.create({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to verify OTP',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    setIsSubmitting(true);
    try {
      const response = await OTPApi.sendOTPForPasswordReset(form.email);

      toaster.create({
        title: 'Success',
        description: 'New OTP code sent to your email',
        type: 'success',
        duration: 5000,
      });

      setOtpExpiresIn(response.expiresIn);
      setForm(prev => ({ ...prev, otp: '' }));
    } catch (error) {
      toaster.create({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to resend OTP',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // #endregion

  // #region Step 3: Reset Password

  const validateStep3 = (): boolean => {
    const newErrors: Partial<ForgotPasswordForm> = {};

    if (!form.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 8) {
      newErrors.newPassword = 'Password must be at least 8 characters';
    }

    if (!form.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResetPassword = async () => {
    if (!validateStep3()) return;

    setIsSubmitting(true);
    try {
      await PasswordApi.resetPassword({
        email: form.email,
        newPassword: form.newPassword,
      });

      toaster.create({
        title: 'Success',
        description: 'Password reset successfully. You can now login with your new password.',
        type: 'success',
        duration: 5000,
      });

      // Redirect to login page
      setTimeout(() => {
        router.push(ROUTES.AUTH.LOGIN);
      }, 2000);
    } catch (error) {
      toaster.create({
        title: 'Failed',
        description: error instanceof Error ? error.message : 'Failed to reset password',
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // #endregion

  // #region Render

  return (
    <Box
      minH="100vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
      bg="layoutBg.500"
      p={4}
    >
      <Box maxW="500px" w="100%" bg="white" p={8} borderRadius="lg" boxShadow="lg">
        {/* Header */}
        <Stack gap={2} mb={6}>
          <Heading size="xl" color="primary.500">
            Forgot Password
          </Heading>
          <Text color="gray.600">
            {step === 1 && 'Enter your email to receive an OTP code'}
            {step === 2 && 'Enter the OTP code sent to your email'}
            {step === 3 && 'Create a new password for your account'}
          </Text>
        </Stack>

        {/* Progress Indicator */}
        <HStack gap={2} mb={6}>
          {[1, 2, 3].map(s => (
            <Box
              key={s}
              flex="1"
              h="4px"
              bg={step >= s ? 'primary.500' : 'gray.200'}
              borderRadius="full"
            />
          ))}
        </HStack>

        {/* Step 1: Email Input */}
        {step === 1 && (
          <Stack gap={4}>
            <FormField label="Email Address" error={errors.email}>
              <FormInput
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="Enter your email"
                disabled={isSubmitting}
              />
            </FormField>

            <Button
              label="Send OTP Code"
              onClick={handleSendOTP}
              width="100%"
              size="lg"
              disabled={isSubmitting}
            />

            <Text textAlign="center" fontSize="sm" color="gray.600">
              Remember your password?{' '}
              <Link href={ROUTES.AUTH.LOGIN}>
                <Text
                  as="span"
                  color="primary.500"
                  fontWeight="bold"
                  pointerEvents={isSubmitting ? 'none' : 'auto'}
                  opacity={isSubmitting ? 0.5 : 1}
                >
                  Login
                </Text>
              </Link>
            </Text>
          </Stack>
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <Stack gap={4}>
            <Box bg="blue.50" p={4} borderRadius="md" border="1px solid" borderColor="blue.200">
              <Text fontSize="sm" color="blue.800">
                OTP code sent to: <strong>{form.email}</strong>
              </Text>
              <Text fontSize="sm" color="blue.600" mt={1}>
                Expires in {Math.floor(otpExpiresIn / 60)} minutes
              </Text>
            </Box>

            <FormField label="OTP Code" error={errors.otp}>
              <FormInput
                type="text"
                value={form.otp}
                onChange={e => setField('otp', e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Enter 6-digit code"
                disabled={isSubmitting}
                maxLength={6}
              />
            </FormField>

            <Button
              label="Verify OTP"
              onClick={handleVerifyOTP}
              width="100%"
              size="lg"
              disabled={isSubmitting}
            />

            <HStack justifyContent="space-between">
              <Button
                label="Back"
                onClick={() => setStep(1)}
                variantType="secondary"
                disabled={isSubmitting}
                size="sm"
              />
              <Button
                label="Resend OTP"
                onClick={handleResendOTP}
                variantType="secondary"
                disabled={isSubmitting}
                size="sm"
              />
            </HStack>
          </Stack>
        )}

        {/* Step 3: Reset Password */}
        {step === 3 && (
          <Stack gap={4}>
            <Box bg="green.50" p={4} borderRadius="md" border="1px solid" borderColor="green.200">
              <Text fontSize="sm" color="green.800">
                ✓ OTP verified successfully
              </Text>
              <Text fontSize="sm" color="green.600" mt={1}>
                Please create a new password
              </Text>
            </Box>

            <FormField label="New Password" error={errors.newPassword}>
              <FormInput
                type="password"
                value={form.newPassword}
                onChange={e => setField('newPassword', e.target.value)}
                placeholder="Enter new password"
                disabled={isSubmitting}
              />
              <Text fontSize="xs" color="gray.500" mt={1}>
                Minimum 8 characters, include uppercase, lowercase, number, and special character
              </Text>
            </FormField>

            <FormField label="Confirm Password" error={errors.confirmPassword}>
              <FormInput
                type="password"
                value={form.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                placeholder="Confirm new password"
                disabled={isSubmitting}
              />
            </FormField>

            <Button
              label="Reset Password"
              onClick={handleResetPassword}
              width="100%"
              size="lg"
              disabled={isSubmitting}
            />

            <Button
              label="Back to Verify OTP"
              onClick={() => setStep(2)}
              variantType="secondary"
              disabled={isSubmitting}
              width="100%"
            />
          </Stack>
        )}
      </Box>

      {/* Loading Backdrop */}
      <LoadingBackdrop
        isLoading={isSubmitting}
        message={
          step === 1
            ? 'Sending OTP code...'
            : step === 2
              ? 'Verifying OTP code...'
              : 'Resetting password...'
        }
      />
    </Box>
  );

  // #endregion
}

// #endregion
