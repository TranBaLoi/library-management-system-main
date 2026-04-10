'use client';

import { Box, HStack, Text, VStack } from '@chakra-ui/react';
import { IconType } from 'react-icons';

interface AlertCardProps {
  title: string;
  description?: string;
  count?: number;
  icon?: IconType;
  iconColor?: string;
  iconBg?: string;
  severity?: 'info' | 'warning' | 'error';
  onClick?: () => void;
}

export function AlertCard({
  title,
  description,
  count,
  icon: Icon,
  iconColor = 'primary.500',
  iconBg = 'primary.200',
  severity = 'info',
  onClick,
}: AlertCardProps) {
  const severityStyles = {
    info: {
      bg: 'status.Reserved',
      textColor: 'statusText.Reserved',
    },
    warning: {
      bg: 'status.Borrowed',
      textColor: 'statusText.Borrowed',
    },
    error: {
      bg: 'status.Damaged',
      textColor: 'statusText.Damaged',
    },
  };

  const style = severityStyles[severity];

  return (
    <Box
      bg="white"
      borderRadius="lg"
      border="1px solid"
      borderColor="gray.200"
      p={4}
      w="100%"
      cursor={onClick ? 'pointer' : 'default'}
      _hover={onClick ? { boxShadow: 'md', transition: 'box-shadow 0.2s' } : {}}
      onClick={onClick}
    >
      <HStack justify="space-between" align="start" gap={4}>
        <HStack gap={3} flex="1">
          {Icon && (
            <Box
              bg={iconBg || style.bg}
              color={iconColor || style.textColor}
              p={2}
              borderRadius="md"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon size={20} />
            </Box>
          )}
          <VStack align="start" gap={0.5} flex="1">
            <HStack gap={2} align="center">
              <Text fontSize="sm" fontWeight="semibold" color="primaryText.500">
                {title}
              </Text>
              {count !== undefined && (
                <Box
                  bg={style.bg}
                  color={style.textColor}
                  px={2}
                  py={0.5}
                  borderRadius="full"
                  fontSize="xs"
                  fontWeight="bold"
                >
                  {count}
                </Box>
              )}
            </HStack>
            {description && (
              <Text fontSize="xs" color="secondaryText.500">
                {description}
              </Text>
            )}
          </VStack>
        </HStack>
      </HStack>
    </Box>
  );
}
