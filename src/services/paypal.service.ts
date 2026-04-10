/**
 * PayPal Service
 * Handles all PayPal API interactions
 * Supports order creation, capture, and currency conversion
 */

import { ValidationError } from '@/lib/errors';

interface PayPalCredentials {
  clientId: string;
  clientSecret: string;
  baseUrl: string;
}

interface PayPalAccessToken {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface PayPalOrder {
  id: string;
  status: string;
}

export class PayPalService {
  private static getCredentials(): PayPalCredentials {
    const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
    const baseUrl = process.env.PAYPAL_BASE_URL;

    if (!clientId || !clientSecret || !baseUrl) {
      throw new ValidationError('PayPal credentials not configured');
    }

    return { clientId, clientSecret, baseUrl };
  }

  /**
   * Get PayPal access token
   */
  static async getAccessToken(): Promise<string> {
    const { clientId, clientSecret, baseUrl } = this.getCredentials();

    const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: 'grant_type=client_credentials',
    });

    if (!response.ok) {
      throw new ValidationError('Failed to get PayPal access token');
    }

    const data: PayPalAccessToken = await response.json();
    return data.access_token;
  }

  /**
   * Convert VND to USD
   * Uses exchange rate API in development, fallback to fixed rate
   */
  static async convertVndToUsd(vndAmount: number): Promise<string> {
    if (process.env.NODE_ENV === 'development') {
      try {
        const exchangeResponse = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
        if (exchangeResponse.ok) {
          const exchangeData = await exchangeResponse.json();
          const vndToUsdRate = 1 / exchangeData.rates.VND; // Convert from USD/VND to VND/USD
          const usdAmount = vndAmount * vndToUsdRate;
          return usdAmount.toFixed(2);
        }
      } catch {
        // Fall through to fallback
      }
    }

    // Fallback to fixed rate
    const fallbackRate = 24000; // 1 USD = 24,000 VND
    return (vndAmount / fallbackRate).toFixed(2);
  }

  /**
   * Create PayPal order
   */
  static async createOrder(
    amount: number,
    referenceId: string,
    description: string,
    returnUrl: string,
    cancelUrl: string
  ): Promise<PayPalOrder> {
    const { baseUrl } = this.getCredentials();
    const accessToken = await this.getAccessToken();
    const usdAmount = await this.convertVndToUsd(amount);

    const response = await fetch(`${baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: referenceId,
            description,
            amount: {
              currency_code: 'USD',
              value: usdAmount,
            },
          },
        ],
        application_context: {
          brand_name: 'Library Management System',
          landing_page: 'NO_PREFERENCE',
          user_action: 'PAY_NOW',
          return_url: returnUrl,
          cancel_url: cancelUrl,
        },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ValidationError(
        `Failed to create PayPal order: ${errorData.message || 'Unknown error'}`
      );
    }

    return await response.json();
  }

  /**
   * Capture PayPal order
   */
  static async captureOrder(orderId: string): Promise<PayPalOrder> {
    const { baseUrl } = this.getCredentials();
    const accessToken = await this.getAccessToken();

    const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new ValidationError(
        `Failed to capture PayPal order: ${errorData.message || 'Unknown error'}`
      );
    }

    const data = await response.json();

    if (data.status !== 'COMPLETED') {
      throw new ValidationError(`PayPal order capture failed with status: ${data.status}`);
    }

    return data;
  }
}
