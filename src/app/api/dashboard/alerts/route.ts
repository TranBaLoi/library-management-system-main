import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { requireLibrarian } from '@/middleware/auth.middleware';
import { DashboardAlert, DashboardAlertsResponse } from '@/types/dashboard';
import { BorrowRequestStatus, BorrowStatus, ItemStatus } from '@prisma/client';
import { NextRequest } from 'next/server';

/**
 * Returns important alerts that need immediate attention.
 * Includes overdue books, pending requests, overdue payments, and books needing maintenance.
 */
export const GET = requireLibrarian(async (_request: NextRequest) => {
  try {
    const now = new Date();

    // Execute all queries in parallel for better performance
    const [overdueBorrows, pendingRequests, overduePayments, booksNeedMaintenance] =
      await Promise.all([
        // 1. Overdue Books - Count borrow records with OVERDUE status
        prisma.borrowRecord.count({
          where: {
            isDeleted: false,
            status: BorrowStatus.OVERDUE,
          },
        }),

        // 2. Pending Borrow Requests - Count pending borrow requests
        prisma.borrowRequest.count({
          where: {
            isDeleted: false,
            status: BorrowRequestStatus.PENDING,
          },
        }),

        // 3. Overdue Payments - Count payments that are unpaid and past due date
        prisma.payment.count({
          where: {
            isDeleted: false,
            isPaid: false,
            dueDate: {
              lt: now, // dueDate is in the past
            },
          },
        }),

        // 4. Books Need Maintenance - Count book items with MAINTENANCE status
        prisma.bookItem.count({
          where: {
            isDeleted: false,
            status: ItemStatus.MAINTENANCE,
          },
        }),
      ]);

    // Build alerts array (always include all 4 alert types, even if count is 0)
    const alerts: DashboardAlert[] = [
      {
        id: 1,
        title: 'Overdue Books',
        description:
          overdueBorrows > 0
            ? `${overdueBorrows} borrow${overdueBorrows > 1 ? 's are' : ' is'} overdue and need attention`
            : 'No overdue books',
        count: overdueBorrows,
        severity: 'error',
      },
      {
        id: 2,
        title: 'Pending Borrow Requests',
        description:
          pendingRequests > 0
            ? `${pendingRequests} borrow request${pendingRequests > 1 ? 's are' : ' is'} waiting for approval`
            : 'No pending borrow requests',
        count: pendingRequests,
        severity: 'warning',
      },
      {
        id: 3,
        title: 'Overdue Payments',
        description:
          overduePayments > 0
            ? `${overduePayments} payment${overduePayments > 1 ? 's are' : ' is'} overdue and need attention`
            : 'No overdue payments',
        count: overduePayments,
        severity: 'error',
      },
      {
        id: 4,
        title: 'Books Need Maintenance',
        description:
          booksNeedMaintenance > 0
            ? `${booksNeedMaintenance} book cop${booksNeedMaintenance > 1 ? 'ies' : 'y'} need${booksNeedMaintenance > 1 ? '' : 's'} maintenance`
            : 'No books need maintenance',
        count: booksNeedMaintenance,
        severity: 'info',
      },
    ];

    const response: DashboardAlertsResponse = {
      alerts,
    };

    return successResponse<DashboardAlertsResponse>(
      response,
      'Dashboard alerts retrieved successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'GET /api/dashboard/alerts');
  }
});
