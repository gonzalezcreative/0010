import { loadStripe } from '@stripe/stripe-js';

const STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY;
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export class PaymentService {
  private stripe;

  constructor() {
    this.stripe = loadStripe(STRIPE_PUBLIC_KEY);
  }

  async createPaymentSession(leadId: string, amount: number) {
    try {
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leadId,
          amount: amount * 100, // Convert to cents
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Payment session creation failed');
      }

      const session = await response.json();
      
      // Redirect to Stripe Checkout
      const stripe = await this.stripe;
      if (!stripe) {
        throw new Error('Stripe failed to initialize');
      }

      const { error } = await stripe.redirectToCheckout({
        sessionId: session.id
      });

      if (error) {
        throw error;
      }

      return session;
    } catch (error: any) {
      console.error('Payment error:', error);
      throw new Error(error.message || 'Payment processing failed');
    }
  }

  async handlePaymentSuccess(sessionId: string) {
    try {
      const response = await fetch(`${API_URL}/api/verify-payment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || 'Payment verification failed');
      }

      return await response.json();
    } catch (error: any) {
      console.error('Payment verification error:', error);
      throw new Error(error.message || 'Payment verification failed');
    }
  }
}