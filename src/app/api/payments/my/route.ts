import { prisma } from '@/lib/prisma';
import { handleRouteError, parseIntParam, successResponse } from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { PaymentsListPayload, PaymentWithDetails } from '@/types/payment';
import { Prisma } from '@prisma/client';

// GET /api/payments/my - Get payments for the current user
export const GET = requireReader(async (request: AuthenticatedRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseIntParam(searchParams.get('page'), 1);
    const limit = parseIntParam(searchParams.get('limit'), 10);
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | null;
    const isPaidParam = searchParams.get('isPaid');

    const skip = (page - 1) * limit;

    // Only get payments for the current user
    const where: Prisma.PaymentWhereInput = {
      isDeleted: false,
      borrowRecord: {
        userId: request.user.id,
      },
      ...(isPaidParam !== null ? { isPaid: isPaidParam === 'true' } : {}),
    };

    if (search) {
      where.OR = [
        { id: { equals: parseInt(search) || -1 } },
        { policy: { name: { contains: search } } },
        { policy: { id: { contains: search } } },
      ];
    }

    // Build orderBy clause
    let orderBy: Prisma.PaymentOrderByWithRelationInput = { createdAt: 'desc' };

    if (sortBy && sortOrder) {
      // Map frontend sort keys to database fields
      const sortFieldMap: Record<string, string> = {
        id: 'id',
        amount: 'amount',
        isPaid: 'isPaid',
        dueDate: 'dueDate',
        paidAt: 'paidAt',
        createdAt: 'createdAt',
      };

      const dbField = sortFieldMap[sortBy];
      if (dbField) {
        orderBy = { [dbField]: sortOrder };
      }
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          policyId: true,
          borrowRecordId: true,
          amount: true,
          isPaid: true,
          paidAt: true,
          dueDate: true,
          createdAt: true,
          updatedAt: true,
          isDeleted: true,
          policy: {
            select: {
              id: true,
              name: true,
            },
          },
          borrowRecord: {
            select: {
              id: true,
              user: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      }),
      prisma.payment.count({ where }),
    ]);

    return successResponse<PaymentsListPayload>({
      payments: payments as PaymentWithDetails[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'GET /api/payments/my');
  }
});
