import { NotFoundError, ValidationError } from '@/lib/errors';
import { prisma } from '@/lib/prisma';

// Payment with borrow record
interface PaymentWithBorrowRecord {
  id: number;
  amount: number;
  policyId: string;
  borrowRecordId: number;
  isPaid: boolean;
  borrowRecord: {
    userId: number;
  };
}

// Validate and get payment with ownership check
export async function validatePaymentOwnership(
  paymentId: number,
  userId: number
): Promise<PaymentWithBorrowRecord> {
  const payment = await prisma.payment.findFirst({
    where: { id: paymentId, isDeleted: false },
    include: {
      borrowRecord: {
        select: {
          userId: true,
        },
      },
    },
  });

  if (!payment) {
    throw new NotFoundError('Payment not found');
  }

  if (payment.borrowRecord.userId !== userId) {
    throw new ValidationError('Payment does not belong to current user');
  }

  if (payment.isPaid) {
    throw new ValidationError('Payment has already been paid');
  }

  return payment as PaymentWithBorrowRecord;
}
