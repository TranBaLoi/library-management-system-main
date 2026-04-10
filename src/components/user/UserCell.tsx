'use client';

import { Box, Stack, Text } from '@chakra-ui/react';

interface UserCellProps {
  user?: { fullName: string; email: string };
  variant?: 'box' | 'stack';
}

/**
 * Component to display user information (fullName and email)
 */
export function UserCell({ user, variant = 'box' }: UserCellProps) {
  if (!user) return <Text color="secondaryText.500">—</Text>;

  const content = (
    <>
      <Text fontSize="sm" fontWeight="medium">
        {user.fullName}
      </Text>
      <Text fontSize="xs" color="secondaryText.500">
        {user.email}
      </Text>
    </>
  );

  if (variant === 'stack') {
    return <Stack gap={0}>{content}</Stack>;
  }

  return <Box>{content}</Box>;
}
