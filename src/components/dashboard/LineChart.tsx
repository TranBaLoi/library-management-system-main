'use client';

import { Chart, useChart } from '@chakra-ui/charts';
import { Box, Text, useToken, VStack } from '@chakra-ui/react';
import { CartesianGrid, Line, LineChart as RechartsLineChart, Tooltip, XAxis } from 'recharts';

interface LineChartDataPoint {
  label: string;
  value: number;
}

interface LineChartProps {
  title?: string;
  data: LineChartDataPoint[];
  height?: number;
  color?: string;
}

export function LineChart({ title, data, height = 200, color = 'primary.500' }: LineChartProps) {
  // Get primary color from theme
  const [primaryColor] = useToken('colors', ['primary.500']);

  // Convert data from {label, value} format to {name, value} format for recharts
  const chartData = data.map(point => ({
    name: point.label,
    value: point.value,
  }));

  const chart = useChart({
    data: chartData.length > 0 ? chartData : [{ name: '', value: 0 }],
  });

  // Determine color based on color prop
  const lineColor = color === 'primary.500' ? primaryColor : '#2D3E5C';

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

  return (
    <Box bg="white" borderRadius="lg" border="1px solid" borderColor="gray.200" p={4} w="100%">
      <VStack align="start" gap={4} w="100%">
        {title && (
          <Text fontSize="lg" fontWeight="semibold" color="primaryText.500">
            {title}
          </Text>
        )}
        <Box w="100%" h={height}>
          <Chart.Root maxH={height} chart={chart}>
            <RechartsLineChart data={chart.data} margin={{ left: 40, right: 40, top: 40 }}>
              <CartesianGrid
                stroke={chart.color('border')}
                strokeDasharray="3 3"
                horizontal={false}
              />
              <XAxis
                dataKey={chart.key('name')}
                angle={-45}
                textAnchor="end"
                height={60}
                stroke={chart.color('border')}
              />
              <Tooltip
                animationDuration={100}
                cursor={{ stroke: chart.color('border') }}
                content={<Chart.Tooltip hideLabel />}
              />
              <Line
                isAnimationActive={false}
                dataKey={chart.key('value')}
                fill={lineColor}
                stroke={lineColor}
                strokeWidth={2}
              />
            </RechartsLineChart>
          </Chart.Root>
        </Box>
      </VStack>
    </Box>
  );
}
