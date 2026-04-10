'use client';

import { AuthApi } from '@/api';
import { Button, LoadingBackdrop, toaster } from '@/components';
import { InterestSelector } from '@/components/interests/InterestSelector';
import { ROUTES } from '@/constants';
import { useCategories, useMe } from '@/lib/hooks';
import { Box, Center, Flex, Heading, Stack, Text } from '@chakra-ui/react';
import { Role } from '@prisma/client';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export default function SelectInterestsPage() {
  const router = useRouter();
  const { data: user, isLoading: userLoading } = useMe();
  const { data: categories, isLoading: categoriesLoading } = useCategories();
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract category names for the selector
  const categoryNames = useMemo(() => {
    if (!categories) return [];
    return categories.map(cat => cat.name);
  }, [categories]);

  // Redirect if not logged in or not READER
  useEffect(() => {
    if (!userLoading && (!user || user.role !== Role.READER)) {
      router.push(ROUTES.HOME);
    }
  }, [user, userLoading, router]);

  // Check if user already has interests set (only redirect if not first login)
  // Use sessionStorage to track if this is a first login redirect
  useEffect(() => {
    if (!userLoading && user && user.role === Role.READER && user.interest) {
      try {
        const interests = JSON.parse(user.interest);
        // Only redirect if user has valid interests array with items
        if (Array.isArray(interests) && interests.length > 0) {
          // Check if this is a first login redirect
          // If 'isFirstLoginRedirect' is in sessionStorage, this is first login, don't redirect
          const isFirstLoginRedirect = sessionStorage.getItem('isFirstLoginRedirect') === 'true';

          if (!isFirstLoginRedirect) {
            // User already has interests from previous session, redirect to home
            router.push(ROUTES.HOME);
          }
          // If isFirstLoginRedirect is true, keep the flag and allow user to set interests
          // Flag will be cleared after successful submission
        }
      } catch {
        // Invalid JSON, allow user to set interests
      }
    }
  }, [user, userLoading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate
    if (selectedInterests.length === 0) {
      setError('Please select at least one interest');
      return;
    }

    try {
      setIsSubmitting(true);
      await AuthApi.updateInterests(selectedInterests);

      toaster.create({
        title: 'Interests saved',
        description: 'Your interests have been saved successfully',
        type: 'success',
        duration: 3000,
      });

      // Clear first login redirect flag after successful submission
      if (typeof window !== 'undefined') {
        sessionStorage.removeItem('isFirstLoginRedirect');
      }

      // Redirect to home page
      router.push(ROUTES.HOME);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to save interests';
      setError(errorMessage);
      toaster.create({
        title: 'Failed to save interests',
        description: errorMessage,
        type: 'error',
        duration: 5000,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state
  if (userLoading) {
    return (
      <Center minH="100vh" bg="layoutBg.500">
        <Text>Loading...</Text>
      </Center>
    );
  }

  // Don't render if user is not READER or already has interests
  if (!user || user.role !== Role.READER) {
    return null;
  }

  return (
    <Center minH="100vh" bg="layoutBg.500" py={8}>
      <Box w="full" maxW="900px" bg="white" rounded="xl" shadow="md" p={8}>
        <Stack gap={6}>
          {/* Header */}
          <Box textAlign="center">
            <Heading size="lg" mb={2}>
              Welcome to Library Management System!
            </Heading>
            <Text fontSize="md" color="secondaryText.500">
              Please select your interests to get personalized book recommendations
            </Text>
          </Box>

          {/* Interest Selection Form */}
          <Box as="form" onSubmit={handleSubmit}>
            <Stack gap={6}>
              <InterestSelector
                selectedInterests={selectedInterests}
                onSelectionChange={setSelectedInterests}
                categories={categoryNames}
                isLoading={categoriesLoading}
                error={error || undefined}
              />

              {/* Submit Button */}
              <Flex justify="center" gap={4}>
                <Button
                  type="submit"
                  variantType="primary"
                  label="Save Interests"
                  disabled={selectedInterests.length === 0 || isSubmitting}
                />
              </Flex>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Loading Backdrop */}
      <LoadingBackdrop isLoading={isSubmitting} message="Saving interests..." />
    </Center>
  );
}
