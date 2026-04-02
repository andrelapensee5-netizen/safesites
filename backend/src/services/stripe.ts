import Stripe from 'stripe';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2024-06-20' });

export const stripeService = {
  async createCheckoutSession(userId: string, email: string, existingCustomerId?: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: existingCustomerId,
      customer_email: existingCustomerId ? undefined : email,
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID_MONTHLY,
          quantity: 1,
        },
      ],
      metadata: { userId },
      success_url: `${frontendUrl}/billing/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendUrl}/billing`,
      allow_promotion_codes: true,
      billing_address_collection: 'auto',
    });

    logger.info(`Created checkout session ${session.id} for user ${userId}`);
    return session;
  },

  async createPortalSession(customerId: string) {
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    return stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${frontendUrl}/billing`,
    });
  },

  async cancelSubscription(subscriptionId: string) {
    return stripe.subscriptions.cancel(subscriptionId);
  },
};
