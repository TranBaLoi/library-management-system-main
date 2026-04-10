'use client';

import { Box, HStack, Text, VStack } from '@chakra-ui/react';

interface TopListItem {
  id: string | number;
  title: string;
  subtitle?: string;
  value: string | number;
  rank?: number;
}

interface TopListProps {
  title: string;
  items: TopListItem[];
  maxItems?: number;
  valueLabel?: string;
}

export function TopList({ title, items, maxItems = 10, valueLabel }: TopListProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" p={4} w="100%">
      <VStack align="start" gap={4} w="100%">
        <Text fontSize="lg" fontWeight="semibold" color="primaryText.500">
          {title}
        </Text>
        <VStack align="start" gap={2} w="100%">
          {displayItems.length === 0 ? (
            <Text fontSize="sm" color="secondaryText.500" textAlign="center" w="100%">
              No data
            </Text>
          ) : (
            displayItems.map((item, index) => (
              <HStack
                key={item.id}
                justify="space-between"
                align="center"
                w="100%"
                p={2}
                borderRadius="md"
                _hover={{ bg: 'paginationBg.500', transition: 'background 0.2s' }}
                gap={4}
              >
                <HStack gap={3} flex="1" minW={0}>
                  <Box
                    minW="24px"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="sm"
                    fontWeight="bold"
                    color={index < 3 ? 'primary.500' : 'secondaryText.500'}
                  >
                    {item.rank !== undefined ? item.rank : index + 1}
                  </Box>
                  <VStack align="start" gap={0} flex="1" minW={0}>
                    <Text fontSize="sm" fontWeight="medium" color="primaryText.500" truncate>
                      {item.title}
                    </Text>
                    {item.subtitle && (
                      <Text fontSize="xs" color="secondaryText.500" truncate>
                        {item.subtitle}
                      </Text>
                    )}
                  </VStack>
                </HStack>
                <Text fontSize="sm" fontWeight="semibold" color="primary.500" whiteSpace="nowrap">
                  {typeof item.value === 'number' ? item.value.toLocaleString('en-US') : item.value}
                  {valueLabel && ` ${valueLabel}`}
                </Text>
              </HStack>
            ))
          )}
        </VStack>
      </VStack>
    </Box>
  );
}
