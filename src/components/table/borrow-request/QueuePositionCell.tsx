'use client';

import { Text } from '@chakra-ui/react';

interface QueuePositionCellProps {
  position: number | null | undefined;
}

export function QueuePositionCell({ position }: QueuePositionCellProps) {
  if (!position) return <Text color="secondaryText.500">—</Text>;
  return (
    <Text fontWeight="medium" color="secondary.500">
      #{position}
    </Text>
  );
}
