import { fetchWithAuth, handleJson } from '@/lib/utils';
import { PaymentsListPayload, PaymentWithDetails } from '@/types/payment';

export class PaymentApi {
  // Get payments with pagination and filters
  static async getPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isPaid?: boolean;
    isDeleted?: boolean;
  }): Promise<PaymentsListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isPaid !== undefined) searchParams.set('isPaid', params.isPaid.toString());
    if (params?.isDeleted !== undefined) searchParams.set('isDeleted', params.isDeleted.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/api/payments?${queryString}` : '/api/payments';

    const response = await fetchWithAuth(url);
    return await handleJson<PaymentsListPayload>(response);
  }

  // Get payments for current user
  static async getMyPayments(params?: {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    isPaid?: boolean;
  }): Promise<PaymentsListPayload> {
    const searchParams = new URLSearchParams();

    if (params?.page) searchParams.set('page', params.page.toString());
    if (params?.limit) searchParams.set('limit', params.limit.toString());
    if (params?.search) searchParams.set('search', params.search);
    if (params?.sortBy) searchParams.set('sortBy', params.sortBy);
    if (params?.sortOrder) searchParams.set('sortOrder', params.sortOrder);
    if (params?.isPaid !== undefined) searchParams.set('isPaid', params.isPaid.toString());

    const queryString = searchParams.toString();
    const url = queryString ? `/api/payments/my?${queryString}` : '/api/payments/my';

    const response = await fetchWithAuth(url);
    return await handleJson<PaymentsListPayload>(response);
  }

  // Get single payment by ID
  static async getPaymentById(id: number): Promise<PaymentWithDetails> {
    const response = await fetchWithAuth(`/api/payments/${id}`);
    return await handleJson<PaymentWithDetails>(response);
  }

  // Create PayPal order
  static async createPayPalOrder(
    paymentId: number
  ): Promise<{ orderId: string; clientId: string }> {
    const response = await fetchWithAuth(`/api/payments/${paymentId}/paypal/create`, {
      method: 'POST',
    });
    return await handleJson<{ orderId: string; clientId: string }>(response);
  }

  // Capture PayPal payment
  static async capturePayPalPayment(
    paymentId: number,
    orderId: string
  ): Promise<{
    payment: PaymentWithDetails;
    borrowRecord: { id: number; actualReturnDate: Date | null };
    paypalOrderId: string;
  }> {
    const response = await fetchWithAuth(`/api/payments/${paymentId}/paypal/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderId }),
    });
    return await handleJson<{
      payment: PaymentWithDetails;
      borrowRecord: { id: number; actualReturnDate: Date | null };
      paypalOrderId: string;
    }>(response);
  }
}
