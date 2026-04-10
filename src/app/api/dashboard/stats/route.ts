import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { DashboardStats, DashboardStatsResponse } from '@/types/dashboard';
import { BorrowRequestStatus, BorrowStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Calculates dashboard statistics.
 * Returns 8 key metrics for the dashboard cards.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    // Calculate current month for revenue
    const currentMonthStart = new Date();
    currentMonthStart.setDate(1);
    currentMonthStart.setHours(0, 0, 0, 0);
    const currentMonthEnd = new Date();
    currentMonthEnd.setMonth(currentMonthEnd.getMonth() + 1);
    currentMonthEnd.setDate(0);
    currentMonthEnd.setHours(23, 59, 59, 999);

    // Execute all queries in parallel for better performance
    // Note: Overview stats cards show total counts (all time), not filtered by time period
    const [
      totalBooks,
      totalBookCopies,
      totalUsers,
      activeBorrows,
      overdueBorrows,
      totalEbooks,
      pendingBorrowRequests,
      totalRevenue,
    ] = await Promise.all([
      // 1. Total Books - Count all books (total count, not filtered by time)
      prisma.book.count({
        where: {
          isDeleted: false,
        },
      }),

      // 2. Total Book Copies - Count all book items (total count, not filtered by time)
      prisma.bookItem.count({
        where: {
          isDeleted: false,
        },
      }),

      // 3. Total Users - Count all users (total count, not filtered by time)
      prisma.user.count({
        where: {
          isDeleted: false,
        },
      }),

      // 4. Active Borrows - Count current borrow records with BORROWED status
      // (shows current active borrows, not filtered by creation date)
      prisma.borrowRecord.count({
        where: {
          isDeleted: false,
          status: BorrowStatus.BORROWED,
        },
      }),

      // 5. Overdue Borrows - Count current borrow records with OVERDUE status
      // (shows current overdue borrows, not filtered by creation date)
      prisma.borrowRecord.count({
        where: {
          isDeleted: false,
          status: BorrowStatus.OVERDUE,
        },
      }),

      // 6. Total Ebooks - Count all ebook editions (total count, not filtered by time)
      prisma.bookEdition.count({
        where: {
          isDeleted: false,
          format: 'EBOOK',
        },
      }),

      // 7. Pending Borrow Requests - Count current pending borrow requests
      // (shows current pending requests, not filtered by creation date)
      prisma.borrowRequest.count({
        where: {
          isDeleted: false,
          status: BorrowRequestStatus.PENDING,
        },
      }),

      // 8. Total Revenue (This Month) - Sum of paid payments in current month
      // (always shows current month revenue, not affected by time filter)
      prisma.payment.aggregate({
        where: {
          isDeleted: false,
          isPaid: true,
          paidAt: {
            gte: currentMonthStart,
            lte: currentMonthEnd,
          },
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const stats: DashboardStats = {
      totalBooks,
      totalBookCopies,
      totalUsers,
      activeBorrows,
      overdueBorrows,
      totalEbooks,
      pendingBorrowRequests,
      totalRevenue: totalRevenue._sum.amount || 0,
    };

    const response: DashboardStatsResponse = {
      stats,
    };

    return successResponse<DashboardStatsResponse>(
      response,
      'Dashboard statistics retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/stats');
  }
});
