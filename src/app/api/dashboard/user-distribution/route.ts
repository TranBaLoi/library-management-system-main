import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { UserDistributionDataPoint, UserDistributionResponse } from '@/types/dashboard';
import { Role } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Calculates user distribution by role.
 * Returns data points for pie chart visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Count users by role in parallel
    const [readerCount, librarianCount, adminCount] = await Promise.all([
      prisma.user.count({
        where: {
          isDeleted: false,
          role: Role.READER,
        },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          role: Role.LIBRARIAN,
        },
      }),
      prisma.user.count({
        where: {
          isDeleted: false,
          role: Role.ADMIN,
        },
      }),
    ]);

    // Map roles to data points with colors
    const data: UserDistributionDataPoint[] = [
      {
        label: 'READER',
        value: readerCount,
        color: 'primary.500',
      },
      {
        label: 'LIBRARIAN',
        value: librarianCount,
        color: 'secondary.500',
      },
      {
        label: 'ADMIN',
        value: adminCount,
        color: '#B6B6B8',
      },
    ];

    const response: UserDistributionResponse = {
      data,
    };

    return successResponse<UserDistributionResponse>(
      response,
      'User distribution data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/user-distribution');
  }
});
