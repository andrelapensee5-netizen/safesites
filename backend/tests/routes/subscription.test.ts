import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockUserFindUnique = jest.fn();
const mockPaymentFindMany = jest.fn();
const mockCreateCheckoutSession = jest.fn().mockResolvedValue({
  id: 'cs_test_123',
  url: 'https://checkout.stripe.com/test',
});
const mockCreatePortalSession = jest.fn().mockResolvedValue({
  url: 'https://billing.stripe.com/portal',
});

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    payment: { findMany: mockPaymentFindMany },
  },
}));

jest.mock('../../src/services/stripe', () => ({
  stripeService: {
    createCheckoutSession: mockCreateCheckoutSession,
    createPortalSession: mockCreatePortalSession,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'user-123';

const activeUser = {
  id: TEST_USER_ID,
  email: 'user@example.com',
  role: 'CONSUMER',
  emailVerified: true,
  subscriptionStatus: 'ACTIVE',
  trialEndsAt: null,
  documentsThisMonth: 7,
  stripeCustomerId: 'cus_test123',
};

function authHeader() {
  return `Bearer ${jwt.sign({ userId: TEST_USER_ID, role: 'CONSUMER' }, TEST_JWT_SECRET)}`;
}

beforeAll(() => { process.env.JWT_SECRET = TEST_JWT_SECRET; });
beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(activeUser);
});

describe('GET /api/v1/subscriptions/status', () => {
  it('returns ACTIVE status for a subscribed user', async () => {
    const res = await request(app)
      .get('/api/v1/subscriptions/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ACTIVE');
    expect(res.body).toHaveProperty('isTrialing', false);
    expect(res.body).toHaveProperty('documentsThisMonth', 7);
  });

  it('reports isTrialing: true when user is within the trial period', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...activeUser,
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86400000),
    });

    const res = await request(app)
      .get('/api/v1/subscriptions/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.isTrialing).toBe(true);
  });

  it('reports isTrialing: false when the trial has expired', async () => {
    mockUserFindUnique.mockResolvedValue({
      ...activeUser,
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 1000),
    });

    const res = await request(app)
      .get('/api/v1/subscriptions/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.isTrialing).toBe(false);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/api/v1/subscriptions/status');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/subscriptions/checkout', () => {
  it('returns a checkout URL and session ID', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('checkoutUrl', 'https://checkout.stripe.com/test');
    expect(res.body).toHaveProperty('sessionId', 'cs_test_123');
  });

  it('passes the user email to the checkout session when no existing customer', async () => {
    mockUserFindUnique.mockResolvedValue({ ...activeUser, stripeCustomerId: null });

    await request(app)
      .post('/api/v1/subscriptions/checkout')
      .set('Authorization', authHeader());

    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      TEST_USER_ID,
      'user@example.com',
      undefined,
    );
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).post('/api/v1/subscriptions/checkout');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/subscriptions/portal', () => {
  it('returns a portal URL for a user with a Stripe customer ID', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions/portal')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('portalUrl', 'https://billing.stripe.com/portal');
    expect(mockCreatePortalSession).toHaveBeenCalledWith('cus_test123');
  });

  it('returns 400 for a user with no Stripe customer ID', async () => {
    mockUserFindUnique.mockResolvedValue({ ...activeUser, stripeCustomerId: null });

    const res = await request(app)
      .post('/api/v1/subscriptions/portal')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).post('/api/v1/subscriptions/portal');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/subscriptions/invoices', () => {
  it('returns the payment history for the user', async () => {
    mockPaymentFindMany.mockResolvedValue([
      { id: 'pay-1', amount: 4900, currency: 'usd', status: 'SUCCEEDED' },
      { id: 'pay-2', amount: 4900, currency: 'usd', status: 'SUCCEEDED' },
    ]);

    const res = await request(app)
      .get('/api/v1/subscriptions/invoices')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(2);
  });

  it('returns an empty array when the user has no payments', async () => {
    mockPaymentFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/subscriptions/invoices')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.payments).toHaveLength(0);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/api/v1/subscriptions/invoices');
    expect(res.status).toBe(401);
  });
});
