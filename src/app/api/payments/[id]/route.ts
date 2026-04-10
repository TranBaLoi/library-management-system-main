import { prisma } from '@/lib/prisma';
import { handleRouteError, successResponse } from '@/lib/utils';
import { PaymentWithDetails } from '@/types/payment';
import { NextRequest } from 'next/server';

// GET /api/payments/[id] - Get single payment by ID
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    if (isNaN(id)) {
      return handleRouteError(new Error('Invalid payment ID'), 'GET /api/payments/[id]');
    }

    const payment = await prisma.payment.findUnique({
      where: { id },
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
    });

    if (!payment) {
      return handleRouteError(new Error('Payment not found'), 'GET /api/payments/[id]');
    }

    return successResponse<PaymentWithDetails>(payment as PaymentWithDetails);
  } catch (error) {
    return handleRouteError(error, 'GET /api/payments/[id]');
  }
}
