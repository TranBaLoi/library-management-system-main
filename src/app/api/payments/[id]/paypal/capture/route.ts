import { ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';
import {
  handleRouteError,
  parseIntParam,
  successResponse,
  validatePaymentOwnership,
} from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { PayPalService } from '@/services';

// POST /api/payments/[id]/paypal/capture - Capture PayPal payment and update database
export const POST = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const paymentId = parseIntParam(id);

    if (paymentId <= 0) {
      throw new ValidationError('Invalid payment ID');
    }

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const orderId = body.orderId;

    if (!orderId || typeof orderId !== 'string') {
      throw new ValidationError('Order ID is required');
    }

    // Validate payment ownership
    const payment = await validatePaymentOwnership(paymentId, request.user.id);

    // Capture PayPal order using service
    await PayPalService.captureOrder(orderId);

    // Update payment and borrow record in transaction
    const result = await prisma.$transaction(async tx => {
      const now = new Date();

      // Update payment
      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          isPaid: true,
          paidAt: now,
        },
      });

      // Get borrow record to check actualReturnDate
      const borrowRecord = await tx.borrowRecord.findUnique({
        where: { id: payment.borrowRecordId },
      });

      // Update borrow record actualReturnDate if not already set
      const updatedBorrowRecord = await tx.borrowRecord.update({
        where: { id: payment.borrowRecordId },
        data: {
          actualReturnDate: borrowRecord?.actualReturnDate || now,
        },
      });

      return { updatedPayment, updatedBorrowRecord };
    });

    return successResponse(
      {
        payment: result.updatedPayment,
        borrowRecord: result.updatedBorrowRecord,
        paypalOrderId: orderId,
      },
      'Payment captured and updated successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/payments/[id]/paypal/capture');
  }
});
