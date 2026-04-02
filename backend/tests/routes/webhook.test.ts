import request from 'supertest';

const mockConstructEvent = jest.fn();
const mockUserUpdate = jest.fn();
const mockUserUpdateMany = jest.fn();
const mockUserFindFirst = jest.fn();
const mockPaymentCreate = jest.fn();

// Must be before app import so the module is mocked before webhook.ts loads Stripe
jest.mock('stripe', () =>
  jest.fn().mockImplementation(() => ({
    webhooks: { constructEvent: mockConstructEvent },
    checkout: { sessions: { create: jest.fn() } },
    billingPortal: { sessions: { create: jest.fn() } },
    subscriptions: { cancel: jest.fn() },
  })),
);

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: {
      findFirst: mockUserFindFirst,
      update: mockUserUpdate,
      updateMany: mockUserUpdateMany,
    },
    payment: { create: mockPaymentCreate },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
  process.env.STRIPE_SECRET_KEY = 'sk_test_dummy';
});

function postStripeEvent(event: object) {
  const payload = JSON.stringify(event);
  mockConstructEvent.mockReturnValue(event);
  return request(app)
    .post('/api/v1/webhooks/stripe')
    .set('Content-Type', 'application/json')
    .set('stripe-signature', 'test-sig')
    .send(Buffer.from(payload));
}

describe('POST /api/v1/webhooks/stripe', () => {
  it('returns 400 when the Stripe signature is invalid', async () => {
    mockConstructEvent.mockImplementation(() => {
      throw new Error('Signature mismatch');
    });

    const res = await request(app)
      .post('/api/v1/webhooks/stripe')
      .set('Content-Type', 'application/json')
      .set('stripe-signature', 'bad-sig')
      .send(Buffer.from(JSON.stringify({ type: 'test' })));

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('signature');
  });

  it('processes checkout.session.completed and activates the subscription', async () => {
    mockUserUpdate.mockResolvedValue({});

    const res = await postStripeEvent({
      type: 'checkout.session.completed',
      data: {
        object: {
          metadata: { userId: 'user-123' },
          subscription: 'sub_abc',
          customer: 'cus_abc',
        },
      },
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      data: expect.objectContaining({
        subscriptionStatus: 'ACTIVE',
        subscriptionId: 'sub_abc',
        stripeCustomerId: 'cus_abc',
        documentsThisMonth: 0,
      }),
    });
  });

  it('skips user update when checkout.session.completed has no userId metadata', async () => {
    const res = await postStripeEvent({
      type: 'checkout.session.completed',
      data: { object: { metadata: {}, subscription: 'sub_abc', customer: 'cus_abc' } },
    });

    expect(res.status).toBe(200);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });

  it('processes invoice.payment_succeeded: records payment and resets monthly counter', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'user-123' });
    mockPaymentCreate.mockResolvedValue({});
    mockUserUpdate.mockResolvedValue({});

    const res = await postStripeEvent({
      type: 'invoice.payment_succeeded',
      data: {
        object: {
          id: 'inv_123',
          customer: 'cus_123',
          payment_intent: 'pi_123',
          amount_paid: 4900,
          currency: 'usd',
        },
      },
    });

    expect(res.status).toBe(200);
    expect(mockPaymentCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ userId: 'user-123', amount: 4900, status: 'SUCCEEDED' }),
      }),
    );
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentsThisMonth: 0 }),
      }),
    );
  });

  it('processes invoice.payment_succeeded gracefully when customer is not found', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const res = await postStripeEvent({
      type: 'invoice.payment_succeeded',
      data: { object: { id: 'inv_1', customer: 'cus_unknown', payment_intent: 'pi_1', amount_paid: 4900, currency: 'usd' } },
    });

    expect(res.status).toBe(200);
    expect(mockPaymentCreate).not.toHaveBeenCalled();
  });

  it('processes invoice.payment_failed and marks subscription as PAST_DUE', async () => {
    mockUserUpdateMany.mockResolvedValue({ count: 1 });

    const res = await postStripeEvent({
      type: 'invoice.payment_failed',
      data: { object: { customer: 'cus_123' } },
    });

    expect(res.status).toBe(200);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_123' },
      data: { subscriptionStatus: 'PAST_DUE' },
    });
  });

  it('processes customer.subscription.deleted and marks subscription as CANCELED', async () => {
    mockUserUpdateMany.mockResolvedValue({ count: 1 });

    const res = await postStripeEvent({
      type: 'customer.subscription.deleted',
      data: { object: { id: 'sub_123' } },
    });

    expect(res.status).toBe(200);
    expect(mockUserUpdateMany).toHaveBeenCalledWith({
      where: { subscriptionId: 'sub_123' },
      data: { subscriptionStatus: 'CANCELED' },
    });
  });

  it('responds with received: true for unknown event types', async () => {
    const res = await postStripeEvent({ type: 'some.unknown.event', data: { object: {} } });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('received', true);
    expect(mockUserUpdate).not.toHaveBeenCalled();
  });
});
