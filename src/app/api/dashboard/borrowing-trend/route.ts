import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import {
  BorrowingTrendDataPoint,
  BorrowingTrendResponse,
  DashboardTimeFilter,
} from '@/types/dashboard';
import { NextRequest } from 'next/server';

/**
 * Calculates borrowing trend data for the last 7 days.
 * Returns data points grouped by day for line chart visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Always use 7 days (last week) - no filter needed
    const days = 7;
    const periodEnd = new Date();
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - days);
    periodStart.setHours(0, 0, 0, 0);
    periodEnd.setHours(23, 59, 59, 999);

    // Fetch all borrow records in the last 7 days
    const borrowRecords = await prisma.borrowRecord.findMany({
      where: {
        isDeleted: false,
        borrowDate: {
          gte: periodStart,
          lte: periodEnd,
        },
      },
      select: {
        borrowDate: true,
      },
      orderBy: {
        borrowDate: 'asc',
      },
    });

    // Group borrow records by day (7 data points)
    const data: BorrowingTrendDataPoint[] = [];
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    for (let i = 0; i < 7; i++) {
      const dayStart = new Date(periodStart);
      dayStart.setDate(dayStart.getDate() + i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      // Count borrows for this day
      const count = borrowRecords.filter(record => {
        const borrowDate = new Date(record.borrowDate);
        return borrowDate >= dayStart && borrowDate <= dayEnd;
      }).length;

      // Format label: "MMM D" (e.g., "Jan 1")
      const label = `${monthNames[dayStart.getMonth()]} ${dayStart.getDate()}`;

      data.push({ label, value: count });
    }

    const response: BorrowingTrendResponse = {
      data,
      timeFilter: '7' as DashboardTimeFilter,
      periodStart,
      periodEnd,
    };

    return successResponse<BorrowingTrendResponse>(
      response,
      'Borrowing trend data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/borrowing-trend');
  }
});
