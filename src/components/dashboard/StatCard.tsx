'use client';

import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: IconType;
  iconColor?: string;
  iconBg?: string;
  trend?: {
    value: number;
    label: string;
    isPositive?: boolean;
  };
}

export function StatCard({
  label,
  value,
  icon: Icon,
  iconColor = 'primary.500',
  iconBg = 'primary.200',
  trend,
}: StatCardProps) {
  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      w="100%"
      _hover={{ boxShadow: 'md', transition: 'box-shadow 0.2s' }}
    >
      <HStack justify="space-between" align="start" gap={4}>
        <VStack align="start" gap={1} flex="1">
          <Text fontSize="sm" color="secondaryText.500" fontWeight="medium">
            {label}
          </Text>
          <Text fontSize="2xl" fontWeight="bold" color="primaryText.500">
            {typeof value === 'number' ? value.toLocaleString('vi-VN') : value}
          </Text>
          {trend && (
            <HStack gap={1} align="center">
              <Text
                fontSize="xs"
                color={trend.isPositive ? 'statusText.Available' : 'statusText.Damaged'}
                fontWeight="medium"
              >
                {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              </Text>
              <Text fontSize="xs" color="secondaryText.500">
                {trend.label}
              </Text>
            </HStack>
          )}
        </VStack>
        {Icon && (
          <Box
            bg={iconBg}
            color={iconColor}
            p={3}
            borderRadius="lg"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Icon size={24} />
          </Box>
        )}
      </HStack>
    </Box>
  );
}
