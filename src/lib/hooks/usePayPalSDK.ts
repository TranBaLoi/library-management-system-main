import { useEffect, useState } from 'react';

declare global {
  interface Window {
    paypal?: {
      Buttons: (config: {
        createOrder: () => Promise<string>;
        onApprove: (data: { orderID: string }) => Promise<void>;
        onError: (err: unknown) => void;
        style?: {
          layout?: 'vertical' | 'horizontal';
          color?: 'gold' | 'blue' | 'silver' | 'white' | 'black';
          shape?: 'rect' | 'pill';
          label?: 'paypal' | 'checkout' | 'buynow' | 'pay' | 'installment' | 'subscribe';
        };
      }) => {
        render: (container: string | HTMLElement) => void;
      };
    };
  }
}

/**
 * Custom hook to load PayPal SDK
 * @returns { isLoaded, error } - Status of PayPal SDK loading
 */
export function usePayPalSDK() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Check if already loaded
    if (window.paypal) {
      setIsLoaded(true);
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="paypal.com/sdk"]');
    if (existingScript) {
      const handleLoad = () => setIsLoaded(true);
      existingScript.addEventListener('load', handleLoad);
      if (window.paypal) {
        setIsLoaded(true);
      }
      return () => existingScript.removeEventListener('load', handleLoad);
    }

    const paypalClientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
    if (!paypalClientId) {
      setError(new Error('PayPal Client ID is not configured'));
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${paypalClientId}&currency=USD`;
    script.async = true;
    script.onload = () => {
      if (window.paypal) {
        setIsLoaded(true);
      }
    };
    script.onerror = () => {
      setError(new Error('Failed to load PayPal SDK'));
    };
    document.body.appendChild(script);

    // Don't remove script on cleanup to avoid reloading
  }, []);

  return { isLoaded, error };
}
