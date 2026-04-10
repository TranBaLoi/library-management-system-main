'use client';

import { AlertCard, BarChart, LineChart, PieChart, Spinner, StatCard, TopList } from '@/components';
import { useDashboardAlerts } from '@/lib/hooks/useDashboardAlerts';
import { useDashboardBookCopiesDistribution } from '@/lib/hooks/useDashboardBookCopiesDistribution';
import { useDashboardBorrowRequestDistribution } from '@/lib/hooks/useDashboardBorrowRequestDistribution';
import { useDashboardBorrowingTrend } from '@/lib/hooks/useDashboardBorrowingTrend';
import { useDashboardStats } from '@/lib/hooks/useDashboardStats';
import { useDashboardTopActiveUsers } from '@/lib/hooks/useDashboardTopActiveUsers';
import { useDashboardTopBorrowedBooks } from '@/lib/hooks/useDashboardTopBorrowedBooks';
import { useDashboardUserDistribution } from '@/lib/hooks/useDashboardUserDistribution';
import { Box, Grid, Text, VStack } from '@chakra-ui/react';
import {
  LuBook,
  LuBookOpen,
  LuCalendar,
  LuDollarSign,
  LuFileWarning,
  LuUsers,
} from 'react-icons/lu';
import { RiFileWarningLine } from 'react-icons/ri';

export default function Dashboard() {
  const { data, isLoading, error } = useDashboardStats();
  const { data: alertsData } = useDashboardAlerts();
  const {
    data: borrowingTrendData,
    isLoading: isBorrowingTrendLoading,
    error: borrowingTrendError,
  } = useDashboardBorrowingTrend();
  const { data: userDistributionData } = useDashboardUserDistribution();
  const { data: bookCopiesDistributionData } = useDashboardBookCopiesDistribution();
  const { data: borrowRequestDistributionData } = useDashboardBorrowRequestDistribution();
  const { data: topBorrowedBooksData } = useDashboardTopBorrowedBooks();
  const { data: topActiveUsersData } = useDashboardTopActiveUsers();

  // Show loading state
  if (isLoading) {
    return (
      <Box w="100%" display="flex" justifyContent="center" alignItems="center" minH="400px">
        <VStack gap={4}>
          <Spinner size="48px" />
          <Text color="secondaryText.500">Loading dashboard statistics...</Text>
        </VStack>
      </Box>
    );
  }

  // Show error state
  if (error) {
    return (
      <Box w="100%" p={4}>
        <Text color="red.500" fontSize="lg" fontWeight="semibold">
          Failed to load dashboard statistics
        </Text>
        <Text color="secondaryText.500" mt={2}>
          {error instanceof Error ? error.message : 'An unexpected error occurred'}
        </Text>
      </Box>
    );
  }

  // Show empty state if no data
  if (!data?.stats) {
    return (
      <Box w="100%" p={4}>
        <Text color="secondaryText.500">No statistics available</Text>
      </Box>
    );
  }

  const stats = data.stats;

  return (
    <Box w="100%">
      <VStack align="start" gap={6} w="100%">
        {/* Overview Stats */}
        <Grid
          templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
          gap={4}
          w="100%"
        >
          <StatCard label="Total Books" value={stats.totalBooks} icon={LuBook} />
          <StatCard label="Total Book Copies" value={stats.totalBookCopies} icon={LuBookOpen} />
          <StatCard label="Total Users" value={stats.totalUsers} icon={LuUsers} />
          <StatCard
            label="Active Borrows"
            value={stats.activeBorrows}
            icon={LuCalendar}
            iconColor="statusText.Borrowed"
            iconBg="status.Borrowed"
          />
          <StatCard
            label="Overdue Borrows"
            value={stats.overdueBorrows}
            icon={RiFileWarningLine}
            iconColor="statusText.Damaged"
            iconBg="status.Damaged"
          />
          <StatCard
            label="Total Ebooks"
            value={stats.totalEbooks}
            icon={LuBook}
            iconColor="statusText.Reserved"
            iconBg="status.Reserved"
          />
          <StatCard
            label="Pending Borrow Requests"
            value={stats.pendingBorrowRequests}
            icon={LuFileWarning}
            iconColor="statusText.Borrowed"
            iconBg="status.Borrowed"
          />
          <StatCard
            label="Total Revenue (This Month)"
            value={`$${stats.totalRevenue.toLocaleString('en-US')}`}
            icon={LuDollarSign}
            iconColor="statusText.Available"
            iconBg="status.Available"
          />
        </Grid>

        {/* Alerts */}
        {alertsData?.alerts && (
          <VStack align="start" gap={3} w="100%">
            <Text fontSize="lg" fontWeight="semibold" color="primaryText.500">
              Important Alerts
            </Text>
            <Grid
              templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
              gap={4}
              w="100%"
            >
              {alertsData.alerts.map(alert => (
                <AlertCard
                  key={alert.id}
                  title={alert.title}
                  description={alert.description}
                  count={alert.count}
                  severity={alert.severity}
                  icon={RiFileWarningLine}
                />
              ))}
            </Grid>
          </VStack>
        )}

        {/* Charts Row 1 */}
        <Grid templateColumns={{ base: '1fr', lg: '2fr 1fr' }} gap={4} w="100%">
          <LineChart title="Borrowing Trend" data={borrowingTrendData?.data || []} height={250} />
          <PieChart title="User Distribution by Role" data={userDistributionData?.data || []} />
        </Grid>

        {/* Charts Row 2 */}
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4} w="100%">
          <BarChart
            title="Book Copies Distribution by Status"
            data={bookCopiesDistributionData?.data || []}
            height={250}
          />
          <BarChart
            title="Borrow Request Distribution by Status"
            data={borrowRequestDistributionData?.data || []}
            height={250}
          />
        </Grid>

        {/* Top Lists */}
        <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4} w="100%">
          <TopList
            title="Top 10 Most Borrowed Books"
            items={topBorrowedBooksData?.items || []}
            valueLabel="borrows"
          />
          <TopList
            title="Top 5 Most Active Users"
            items={topActiveUsersData?.items || []}
            valueLabel="borrows"
          />
        </Grid>
      </VStack>
    </Box>
  );
}
