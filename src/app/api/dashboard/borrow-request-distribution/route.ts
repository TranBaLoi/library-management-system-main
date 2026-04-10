import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import {
  BorrowRequestDistributionDataPoint,
  BorrowRequestDistributionResponse,
} from '@/types/dashboard';
import { BorrowRequestStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Calculates borrow request distribution by status.
 * Returns data points for bar chart visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Count borrow requests by status in parallel
    const [
      pendingCount,
      approvedCount,
      rejectedCount,
      cancelledCount,
      expiredCount,
      fulfilledCount,
    ] = await Promise.all([
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.PENDING,
        },
      }),
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.APPROVED,
        },
      }),
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.REJECTED,
        },
      }),
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.CANCELLED,
        },
      }),
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.EXPIRED,
        },
      }),
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.FULFILLED,
        },
      }),
    ]);

    // Map statuses to data points with colors (based on mock data)
    const data: BorrowRequestDistributionDataPoint[] = [
      {
        label: 'APPROVED',
        value: approvedCount,
        color: 'status.Available',
      },
      {
        label: 'PENDING',
        value: pendingCount,
        color: 'status.Reserved',
      },
      {
        label: 'REJECTED',
        value: rejectedCount,
        color: 'status.Damaged',
      },
      {
        label: 'FULFILLED',
        value: fulfilledCount,
        color: 'primary.500',
      },
      {
        label: 'CANCELLED',
        value: cancelledCount,
        color: 'status.Damaged',
      },
      {
        label: 'EXPIRED',
        value: expiredCount,
        color: 'status.Damaged',
      },
    ];

    const response: BorrowRequestDistributionResponse = {
      data,
    };

    return successResponse<BorrowRequestDistributionResponse>(
      response,
      'Borrow request distribution data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/borrow-request-distribution');
  }
});
