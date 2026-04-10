'use client';

import { Button, FormField, FormInput, LoadingBackdrop } from '@/components';
import { ROUTES } from '@/constants';
import { useLoginForm } from '@/lib/hooks';
import { Box, Center, Image, Stack, Text } from '@chakra-ui/react';
import Link from 'next/link';

export default function LoginPage() {
  const { form, errors, isSubmitting, setField, handleSubmit } = useLoginForm();

  return (
    <Center minH="100vh" bg="layoutBg.500">
      <Box w="full" maxW="450px" bg="white" rounded="xl" shadow="md" p={12}>
        {/* Logo & Title */}
        <Center flexDirection="column" mb={10}>
          <Image src="/logo.png" alt="Library Management System" width="50px" mb={3} />
          <Text fontSize="2xl" fontWeight="semibold">
            Library Management System
          </Text>
          <Text fontSize="sm" color="secondaryText.500">
            Sign in to your account
          </Text>
        </Center>

        {/* Login Form */}
        <Box as="form" onSubmit={handleSubmit}>
          <Stack gap={4}>
            {/* Email */}
            <FormField label="Email Address" fontWeight="400" fontSize="sm" error={errors.email}>
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
            <FormField label="Password" fontWeight="400" fontSize="sm" error={errors.password}>
              <FormInput
                type="password"
                value={form.password}
                onChange={e => setField('password', e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                disabled={isSubmitting}
              />
            </FormField>

            {/* Forgot Password Link */}
            <Box textAlign="right" mb={4}>
              <Link href={ROUTES.AUTH.FORGOT_PASSWORD}>
                <Text
                  fontSize="sm"
                  color="primary.500"
                  _hover={{ textDecoration: 'underline' }}
                  cursor="pointer"
                  pointerEvents={isSubmitting ? 'none' : 'auto'}
                  opacity={isSubmitting ? 0.5 : 1}
                >
                  Forgot password?
                </Text>
              </Link>
            </Box>

            {/* Submit Button */}
            <Button
              type="submit"
              variantType="primary"
              justifyContent="center"
              label="Sign In"
              width="full"
              disabled={isSubmitting}
            />
          </Stack>
        </Box>

        {/* Register Link */}
        <Center mt={4}>
          <Text fontSize="sm" color="secondaryText.500">
            Don&apos;t have an account?{' '}
            <Link href={ROUTES.AUTH.REGISTER} style={{ display: 'inline' }}>
              <Text
                as="span"
                color="primary.500"
                fontWeight="medium"
                textDecoration="none"
                _hover={{ textDecoration: 'underline' }}
                pointerEvents={isSubmitting ? 'none' : 'auto'}
                opacity={isSubmitting ? 0.5 : 1}
              >
                Sign up
              </Text>
            </Link>
          </Text>
        </Center>
      </Box>

      {/* Loading Backdrop */}
      <LoadingBackdrop isLoading={isSubmitting} message="Signing in..." />
    </Center>
  );
}
