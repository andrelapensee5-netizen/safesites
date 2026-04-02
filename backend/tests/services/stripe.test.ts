const mockCheckoutCreate = jest.fn();
const mockPortalCreate = jest.fn();
const mockSubscriptionsCancel = jest.fn();

jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    checkout: { sessions: { create: mockCheckoutCreate } },
    billingPortal: { sessions: { create: mockPortalCreate } },
    subscriptions: { cancel: mockSubscriptionsCancel },
  })),
);

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { stripeService } from '../../src/services/stripe';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
  process.env.STRIPE_PRICE_ID_MONTHLY = 'price_test_monthly';
});

describe('stripeService.createCheckoutSession', () => {
  beforeEach(() => {
    mockCheckoutCreate.mockResolvedValue({ id: 'cs_test_123', url: 'https://checkout.stripe.com/test' });
  });

  it('creates a session with user metadata and email when no customer ID exists', async () => {
    const session = await stripeService.createCheckoutSession('user-1', 'user@test.com');
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { userId: 'user-1' },
        customer_email: 'user@test.com',
      }),
    );
    expect(session.id).toBe('cs_test_123');
  });

  it('uses existing customer ID and omits customer_email when provided', async () => {
    await stripeService.createCheckoutSession('user-1', 'user@test.com', 'cus_existing');
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_existing',
        customer_email: undefined,
      }),
    );
  });

  it('sets subscription mode and correct success/cancel URLs', async () => {
    await stripeService.createCheckoutSession('user-1', 'user@test.com');
    expect(mockCheckoutCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'subscription',
        success_url: expect.stringContaining('http://localhost:3000/billing/success'),
        cancel_url: expect.stringContaining('http://localhost:3000/billing'),
      }),
    );
  });
});

describe('stripeService.createPortalSession', () => {
  beforeEach(() => {
    mockPortalCreate.mockResolvedValue({ url: 'https://billing.stripe.com/portal' });
  });

  it('creates a portal session for the given customer and returns its URL', async () => {
    const session = await stripeService.createPortalSession('cus_123');
    expect(mockPortalCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        customer: 'cus_123',
        return_url: expect.stringContaining('http://localhost:3000/billing'),
      }),
    );
    expect(session.url).toBe('https://billing.stripe.com/portal');
  });
});

describe('stripeService.cancelSubscription', () => {
  it('calls stripe subscriptions.cancel with the given subscription ID', async () => {
    mockSubscriptionsCancel.mockResolvedValue({ id: 'sub_123', status: 'canceled' });
    await stripeService.cancelSubscription('sub_123');
    expect(mockSubscriptionsCancel).toHaveBeenCalledWith('sub_123');
  });
});
