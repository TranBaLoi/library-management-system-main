'use client';

import { Button } from '@/components/buttons';
import { HStack, Text } from '@chakra-ui/react';

export type TimeRange = '7d' | '30d' | '90d' | '1y' | 'all';

interface TimeRangeSelectorProps {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}

const timeRangeOptions: { value: TimeRange; label: string }[] = [
  { value: '7d', label: '7 days' },
  { value: '30d', label: '30 days' },
  { value: '90d', label: '90 days' },
  { value: '1y', label: '1 year' },
  { value: 'all', label: 'All time' },
];

export function TimeRangeSelector({ value, onChange }: TimeRangeSelectorProps) {
  return (
    <HStack gap={2} flexWrap="wrap">
      <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
        Time range:
      </Text>
      {timeRangeOptions.map(option => (
        <Button
          key={option.value}
          label={option.label}
          variantType={value === option.value ? 'primary' : 'tertiary'}
          onClick={() => onChange(option.value)}
          h="32px"
          fontSize="xs"
          px={3}
        />
      ))}
    </HStack>
  );
}
