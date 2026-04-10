'use client';

import { Box } from '@chakra-ui/react';

type SpinnerProps = {
  size?: string;
  thickness?: string;
  color?: string;
  trackColor?: string;
  duration?: string;
};

export function Spinner({
  size = '32px',
  thickness = '4px',
  color = 'primary.500',
  trackColor = 'gray.200',
  duration = '1s',
}: SpinnerProps) {
  return (
    <Box
      width={size}
      height={size}
      border={`${thickness} solid`}
      borderColor={trackColor}
      borderTop={`${thickness} solid`}
      borderTopColor={color}
      borderRadius="50%"
      animation={`spin ${duration} linear infinite`}
    />
  );
}
