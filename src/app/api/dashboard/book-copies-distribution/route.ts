import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { BookCopiesDistributionDataPoint, BookCopiesDistributionResponse } from '@/types/dashboard';
import { ItemStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Calculates book copies distribution by status.
 * Returns data points for bar chart visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Count book items by status in parallel
    const [
      availableCount,
      onBorrowCount,
      reservedCount,
      maintenanceCount,
      lostCount,
      retiredCount,
    ] = await Promise.all([
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.AVAILABLE,
        },
      }),
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.ON_BORROW,
        },
      }),
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.RESERVED,
        },
      }),
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.MAINTENANCE,
        },
      }),
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.LOST,
        },
      }),
      prisma.bookItem.count({
        where: {
          isDeleted: false,
          status: ItemStatus.RETIRED,
        },
      }),
    ]);

    // Map statuses to data points with colors
    const data: BookCopiesDistributionDataPoint[] = [
      {
        label: 'AVAILABLE',
        value: availableCount,
        color: 'status.Available',
      },
      {
        label: 'ON_BORROW',
        value: onBorrowCount,
        color: 'status.Borrowed',
      },
      {
        label: 'RESERVED',
        value: reservedCount,
        color: 'status.Reserved',
      },
      {
        label: 'MAINTENANCE',
        value: maintenanceCount,
        color: 'status.Damaged',
      },
      {
        label: 'LOST',
        value: lostCount,
        color: 'status.Lost',
      },
      {
        label: 'RETIRED',
        value: retiredCount,
        color: 'status.Damaged',
      },
    ];

    const response: BookCopiesDistributionResponse = {
      data,
    };

    return successResponse<BookCopiesDistributionResponse>(
      response,
      'Book copies distribution data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/book-copies-distribution');
  }
});
