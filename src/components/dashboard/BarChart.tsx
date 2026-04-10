'use client';

import { Box, HStack, Text, VStack } from '@chakra-ui/react';

interface BarChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  title?: string;
  data: BarChartDataPoint[];
  height?: number;
  showValues?: boolean;
}

export function BarChart({ title, data, height = 200, showValues = true }: BarChartProps) {
  if (data.length === 0) {
    return (
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        p={4}
        h={height}
        display="flex"
        alignItems="center"
        justifyContent="center"
      >
        <Text fontSize="sm" color="secondaryText.500">
          No data
        </Text>
      </Box>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value)) || 1;

  return (
    <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" p={4} w="100%">
      <VStack align="start" gap={4} w="100%">
        {title && (
          <Text fontSize="lg" fontWeight="semibold" color="primaryText.500">
            {title}
          </Text>
        )}
        <VStack align="start" gap={3} w="100%">
          {data.map((point, index) => {
            const percentage = (point.value / maxValue) * 100;
            const barColor = point.color || 'primary.500';

            return (
              <VStack key={index} align="start" gap={1} w="100%">
                <HStack justify="space-between" w="100%">
                  <Text fontSize="sm" color="primaryText.500" fontWeight="medium">
                    {point.label}
                  </Text>
                  {showValues && (
                    <Text fontSize="sm" color="secondaryText.500" fontWeight="semibold">
                      {point.value.toLocaleString('vi-VN')}
                    </Text>
                  )}
                </HStack>
                <Box
                  w="100%"
                  h="24px"
                  bg="paginationBg.500"
                  borderRadius="md"
                  position="relative"
                  overflow="hidden"
                >
                  <Box
                    h="100%"
                    w={`${percentage}%`}
                    bg={
                      barColor.startsWith('#')
                        ? barColor
                        : barColor === 'primary.500'
                          ? 'primary.500'
                          : barColor === 'secondary.500'
                            ? 'secondary.500'
                            : barColor
                    }
                    borderRadius="md"
                    transition="width 0.3s ease"
                  />
                </Box>
              </VStack>
            );
          })}
        </VStack>
      </VStack>
    </Box>
  );
}
