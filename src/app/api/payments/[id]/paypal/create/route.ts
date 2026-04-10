import { ValidationError } from '@/lib/errors';
import {
  handleRouteError,
  parseIntParam,
  successResponse,
  validatePaymentOwnership,
} from '@/lib/utils';
import { AuthenticatedRequest, requireReader } from '@/middleware/auth.middleware';
import { PayPalService } from '@/services';

// POST /api/payments/[id]/paypal/create - Create PayPal order
export const POST = requireReader(async (request: AuthenticatedRequest, context?: unknown) => {
  try {
    const { params } = context as { params: Promise<{ id: string }> };
    const { id } = await params;
    const paymentId = parseIntParam(id);

    if (paymentId <= 0) {
      throw new ValidationError('Invalid payment ID');
    }

    // Validate payment ownership
    const payment = await validatePaymentOwnership(paymentId, request.user.id);

    // Create PayPal order using service
    const order = await PayPalService.createOrder(
      payment.amount,
      `PAYMENT-${payment.id}`,
      `Payment for violation: ${payment.policyId}`,
      `${process.env.NEXT_PUBLIC_APP_URL}/my-violations/${payment.id}?paypal=success`,
      `${process.env.NEXT_PUBLIC_APP_URL}/my-violations/${payment.id}?paypal=cancel`
    );

    return successResponse(
      {
        orderId: order.id,
        clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID!,
      },
      'PayPal order created successfully'
    );
  } catch (error) {
    return handleRouteError(error, 'POST /api/payments/[id]/paypal/create');
  }
});
