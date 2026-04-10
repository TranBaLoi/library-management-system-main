'use client';

import { Box, HStack, Text, VStack } from '@chakra-ui/react';

interface PieChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface PieChartProps {
  title?: string;
  data: PieChartDataPoint[];
  showLegend?: boolean;
}

const defaultColors = [
  '#ff7b42', // primary.500
  '#2D3E5C', // secondary.500
  '#e7f3ef', // status.Available
  '#ffcbbf', // status.Borrowed
  '#e5effa', // status.Reserved
  '#f9e8e9', // status.Damaged
  '#ededef', // status.Lost
];

export function PieChart({ title, data, showLegend = true }: PieChartProps) {
  if (data.length === 0) {
    return (
      <Box
        bg="white"
        borderRadius="lg"
        border="1px solid"
        borderColor="gray.200"
        p={4}
        display="flex"
        alignItems="center"
        justifyContent="center"
        minH="200px"
      >
        <Text fontSize="sm" color="secondaryText.500">
          No data
        </Text>
      </Box>
    );
  }

  const total = data.reduce((sum, point) => sum + point.value, 0);
  let currentAngle = -90;

  const segments = data.map((point, index) => {
    const percentage = (point.value / total) * 100;
    const angle = (point.value / total) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startAngleRad = (startAngle * Math.PI) / 180;
    const endAngleRad = (endAngle * Math.PI) / 180;

    const x1 = 50 + 40 * Math.cos(startAngleRad);
    const y1 = 50 + 40 * Math.sin(startAngleRad);
    const x2 = 50 + 40 * Math.cos(endAngleRad);
    const y2 = 50 + 40 * Math.sin(endAngleRad);

    const largeArcFlag = angle > 180 ? 1 : 0;

    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 40 40 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`,
    ].join(' ');

    const colorValue = point.color || defaultColors[index % defaultColors.length];
    // Convert Chakra color token to hex if needed
    const colorMap: Record<string, string> = {
      'primary.500': '#ff7b42',
      'secondary.500': '#2D3E5C',
      'status.Available': '#e7f3ef',
      'status.Borrowed': '#ffcbbf',
      'status.Reserved': '#e5effa',
      'status.Damaged': '#f9e8e9',
      'status.Lost': '#ededef',
    };
    const color = colorMap[colorValue] || colorValue;

    return {
      pathData,
      color,
      colorToken: colorValue, // Keep original for Box bg
      label: point.label,
      value: point.value,
      percentage,
    };
  });

  return (
    <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" p={4} w="100%">
      <VStack align="start" gap={4} w="100%">
        {title && (
          <Text fontSize="lg" fontWeight="semibold" color="primaryText.500">
            {title}
          </Text>
        )}
        <Box
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          gap={8}
          w="100%"
          flexWrap="wrap"
        >
          <Box flexShrink={0}>
            <svg width="200" height="200" viewBox="0 0 100 100">
              {segments.map((segment, index) => (
                <path
                  key={index}
                  d={segment.pathData}
                  fill={segment.color}
                  stroke="white"
                  strokeWidth="1"
                />
              ))}
            </svg>
          </Box>
          {showLegend && (
            <VStack align="start" gap={4} flex="1" w="fit-content">
              {segments.map((segment, index) => (
                <HStack key={index} gap={2} align="center">
                  <Box
                    w="16px"
                    h="16px"
                    bg={segment.colorToken || segment.color}
                    borderRadius="sm"
                    flexShrink={0}
                  />
                  <HStack gap={2} flex="1">
                    <Text fontSize="sm" color="primaryText.500" fontWeight="medium">
                      {segment.label}
                    </Text>
                    <Text fontSize="sm" color="secondaryText.500">
                      ({segment.percentage.toFixed(1)}%)
                    </Text>
                  </HStack>
                  <Text fontSize="sm" color="primaryText.500" fontWeight="semibold">
                    {segment.value.toLocaleString('vi-VN')}
                  </Text>
                </HStack>
              ))}
            </VStack>
          )}
        </Box>
      </VStack>
    </Box>
  );
}
