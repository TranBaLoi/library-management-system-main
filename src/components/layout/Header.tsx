'use client';

import { Breadcrumbs, IconButton } from '@/components';
import { pageHeadings } from '@/constants';
import { USER_ROLES } from '@/constants/user';
import { useMe } from '@/lib/hooks';
import { Box, Flex, Heading, HStack, Image, Stack, Text } from '@chakra-ui/react';
import { usePathname } from 'next/navigation';
import { FiBell } from 'react-icons/fi';

export function Header() {
  const pathname = usePathname();
  const { data: user } = useMe();

  // Find heading for dynamic routes
  const heading =
    pageHeadings[pathname] ||
    pageHeadings[pathname.replace(/\/\d+$/, '')] || // Remove trailing ID
    'Dashboard';

  return (
    <Flex as="header" align="center" justify="space-between" paddingBottom={4} bg="layoutBg.500">
      <Box>
        <Heading fontSize="2xl" fontWeight="semibold" mb={1}>
          {heading}
        </Heading>
        <Breadcrumbs pathname={pathname} headingsMap={pageHeadings} />
      </Box>

      <HStack gap={3}>
        <IconButton>
          <FiBell />
        </IconButton>

        <HStack gap={3} pl={2}>
          {user?.avatarUrl ? (
            <Image
              src={user.avatarUrl}
              alt={user.fullName || ''}
              boxSize="42px"
              borderRadius="full"
            />
          ) : (
            <Flex align="center" justify="center" boxSize="42px" borderRadius="full" bg="gray.200">
              <Text fontSize="lg" fontWeight="bold" color="gray.700">
                {user?.fullName ? user.fullName.charAt(0).toUpperCase() : ''}
              </Text>
            </Flex>
          )}
          <Stack gap={0}>
            <Text fontSize="lg" fontWeight="semibold">
              {user?.fullName || ''}
            </Text>
            <Text color="secondaryText.500" fontSize="md">
              {user?.role ? USER_ROLES[user.role] : ''}
            </Text>
          </Stack>
        </HStack>
      </HStack>
    </Flex>
  );
}
