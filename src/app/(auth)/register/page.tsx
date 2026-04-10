'use client';

import { Button, FormField, FormInput, LoadingBackdrop } from '@/components';
import { useRegisterForm } from '@/lib/hooks/useRegisterForm';
import { Box, Center, Image, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';

export default function RegisterPage() {
  const { form, errors, isSubmitting, setField, handleSubmit } = useRegisterForm();

  return (
    <Center minH="100vh" bg="layoutBg.500">
      <Box w="full" maxW="520px" bg="white" rounded="xl" shadow="md" p={12}>
        {/* Logo & Title */}
        <Center flexDirection="column" mb={10}>
          <Image src="/logo.png" alt="Library Management System" width="50px" mb={3} />
          <Text fontSize="2xl" fontWeight="semibold">
            Create your account
          </Text>
          <Text fontSize="sm" color="secondaryText.500">
            Join the Library Management System
          </Text>
        </Center>

        {/* Register Form */}
        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={4}>
            {/* Full Name */}
            <FormField label="Full name*" fontWeight="400" fontSize="sm" error={errors.fullName}>
              <FormInput
                value={form.fullName}
                onChange={e => setField('fullName', e.target.value)}
                placeholder="Enter your full name"
                autoComplete="name"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Email */}
            <FormField label="Email Address*" fontWeight="400" fontSize="sm" error={errors.email}>
              <FormInput
                type="email"
                value={form.email}
                onChange={e => setField('email', e.target.value)}
                placeholder="Enter your email address"
                autoComplete="email"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Password */}
            <FormField label="Password*" fontWeight="400" fontSize="sm" error={errors.password}>
              <FormInput
                type="password"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder="Enter your password"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Confirm Password */}
            <FormField
              label="Confirm password*"
              fontWeight="400"
              fontSize="sm"
              error={errors.confirmPassword}
            >
              <FormInput
                type="password"
                value={form.confirmPassword}
                onChange={e => setField('confirmPassword', e.target.value)}
                placeholder="Re-enter your password"
                autoComplete="new-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Phone Number (optional) */}
            <FormField label="Phone" fontWeight="400" fontSize="sm">
              <FormInput
                value={form.phoneNumber || ''}
                onChange={e => setField('phoneNumber', e.target.value)}
                placeholder="Enter your phone number"
                autoComplete="tel"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Address (optional) */}
            <FormField label="Address" fontWeight="400" fontSize="sm">
              <FormInput
                value={form.address || ''}
                onChange={e => setField('address', e.target.value)}
                placeholder="Enter your address"
                autoComplete="street-address"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Submit Button */}
            <Button
              type="submit"
              variantType="primary"
              justifyContent="center"
              label="Create account"
              width="full"
              disabled={isSubmitting}
            />
          </Stack>
        </Box>

        {/* Login Link */}
        <Center mt={4}>
          <Text fontSize="sm" color="secondaryText.500">
            Already have an account?{' '}
            <Link href="/login" style={{ display: 'inline' }}>
              <Text
                as="span"
                color="primary.500"
                fontWeight="medium"
                textDecoration="none"
                _hover={{ textDecoration: 'underline' }}
                pointerEvents={isSubmitting ? 'none' : 'auto'}
                opacity={isSubmitting ? 0.5 : 1}
              >
                Sign in
              </Text>
            </Link>
          </Text>
        </Center>
      </Box>

      {/* Loading Backdrop */}
      <LoadingBackdrop isLoading={isSubmitting} message="Creating account..." />
    </Center>
  );
}
