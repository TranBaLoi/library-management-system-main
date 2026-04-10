'use client';

import { Box, Portal, Text, VStack } from '@chakra-ui/react';
import { Spinner } from './Spinner';

interface LoadingBackdropProps {
  isLoading: boolean;
  message?: string;
}

export function LoadingBackdrop({ isLoading, message = 'Processing...' }: LoadingBackdropProps) {
  if (!isLoading) return null;

  return (
    <Portal>
      <Box
        position="fixed"
        top={0}
        left={0}
        right={0}
        bottom={0}
        bg="blackAlpha.600"
        zIndex={9999}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <VStack gap={4}>
          <Spinner size="48px" color="white" trackColor="whiteAlpha.300" />
          <Text color="white" fontSize="md" fontWeight="medium">
            {message}
          </Text>
        </VStack>
      </Box>
    </Portal>
  );
}
