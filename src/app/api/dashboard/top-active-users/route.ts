import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { TopActiveUsersResponse } from '@/types/dashboard';
import { NextRequest } from 'next/server';

/**
 * Calculates top 5 most active users.
 * Counts borrow records per user.
 * Returns data for TopList component visualization.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Get all borrow records with user information
    const borrowRecords = await prisma.borrowRecord.findMany({
      where: {
        isDeleted: false,
        user: {
          isDeleted: false,
        },
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    // Count borrows per user
    const userBorrowCounts = new Map<
      number,
      { userId: number; fullName: string; email: string; count: number }
    >();

    for (const record of borrowRecords) {
      const userId = record.userId;
      const user = record.user;

      if (!user) continue;

      const existing = userBorrowCounts.get(userId);
      if (existing) {
        existing.count += 1;
      } else {
        userBorrowCounts.set(userId, {
          userId,
          fullName: user.fullName,
          email: user.email,
          count: 1,
        });
      }
    }

    // Convert to array, sort by count descending, and take top 5
    const topUsers = Array.from(userBorrowCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
      .map((user, index) => ({
        id: user.userId,
        title: user.fullName,
        subtitle: user.email,
        value: user.count,
        rank: index + 1,
      }));

    const response: TopActiveUsersResponse = {
      items: topUsers,
    };

    return successResponse<TopActiveUsersResponse>(
      response,
      'Top active users data retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/top-active-users');
  }
});
