'use client';

import { Tag as ChakraTag } from '@chakra-ui/react';

export type TagVariantType = 'active' | 'reserved' | 'borrowed' | 'inactive' | 'lost';

export interface TagProps extends ChakraTag.RootProps {
  children: React.ReactNode;
  variantType?: TagVariantType;
}

export function Tag({ variantType = 'active', children, ...props }: TagProps) {
  const variantStyles = {
    active: {
      bg: 'status.Available',
      color: 'statusText.Available',
      variant: 'surface' as const,
    },
    reserved: {
      bg: 'status.Reserved',
      color: 'statusText.Reserved',
      variant: 'surface' as const,
    },
    borrowed: {
      bg: 'status.Borrowed',
      color: 'statusText.Borrowed',
      variant: 'surface' as const,
    },
    inactive: {
      bg: 'status.Damaged',
      color: 'statusText.Damaged',
      variant: 'surface' as const,
    },
    lost: {
      bg: 'status.Lost',
      color: 'statusText.Lost',
      variant: 'surface' as const,
    },
  };

  const style = variantStyles[variantType];

  return (
    <ChakraTag.Root {...style} {...props} rounded="full" px={2} justifyContent="center">
      <ChakraTag.Label fontWeight="medium">{children}</ChakraTag.Label>
    </ChakraTag.Root>
  );
}
