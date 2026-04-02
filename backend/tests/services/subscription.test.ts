const mockUserFindUnique = jest.fn();
const mockUserUpdate = jest.fn();

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      update: mockUserUpdate,
    },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { subscriptionService } from '../../src/services/subscription';

describe('subscriptionService.checkDocumentLimit', () => {
  beforeEach(() => jest.clearAllMocks());

  it('resolves for an ACTIVE subscriber', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'ACTIVE',
      documentsThisMonth: 10,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).resolves.toBeUndefined();
  });

  it('resolves for a TRIALING user within the 3-document limit', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86400000),
      documentsThisMonth: 2,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).resolves.toBeUndefined();
  });

  it('throws 403 when trial document limit (3) is reached', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86400000),
      documentsThisMonth: 3,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 403 when trial has expired', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() - 1000),
      documentsThisMonth: 0,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 403 for a CANCELED subscription', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'CANCELED',
      documentsThisMonth: 0,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 403 for a PAST_DUE subscription', async () => {
    mockUserFindUnique.mockResolvedValue({
      id: 'u1',
      subscriptionStatus: 'PAST_DUE',
      documentsThisMonth: 0,
    });
    await expect(subscriptionService.checkDocumentLimit('u1')).rejects.toMatchObject({
      statusCode: 403,
    });
  });

  it('throws 404 when user is not found', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    await expect(subscriptionService.checkDocumentLimit('missing')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});

describe('subscriptionService.incrementDocumentCount', () => {
  beforeEach(() => jest.clearAllMocks());

  it('calls prisma.user.update with increment: 1', async () => {
    mockUserUpdate.mockResolvedValue({ documentsThisMonth: 6 });
    await subscriptionService.incrementDocumentCount('u1');
    expect(mockUserUpdate).toHaveBeenCalledWith({
      where: { id: 'u1' },
      data: { documentsThisMonth: { increment: 1 } },
    });
  });
});

describe('subscriptionService.getEffectivePrice', () => {
  it('returns 0 for documents 0 through 15 (included in subscription)', () => {
    for (let i = 0; i <= 15; i++) {
      expect(subscriptionService.getEffectivePrice(i)).toBe(0);
    }
  });

  it('charges a positive price for the 16th document onward', () => {
    expect(subscriptionService.getEffectivePrice(16)).toBeGreaterThan(0);
  });

  it('scales proportionally: price for N extra docs equals Math.round(rate * 2 * N)', () => {
    const perDocRate = 4900 / 15;
    expect(subscriptionService.getEffectivePrice(20)).toBe(Math.round(perDocRate * 2 * 5));
    expect(subscriptionService.getEffectivePrice(25)).toBe(Math.round(perDocRate * 2 * 10));
  });

  it('applies the 2x overage rate (price per doc is double the base per-doc rate)', () => {
    const basePerDocCents = 4900 / 15;
    const expectedForOneExtra = Math.round(basePerDocCents * 2 * 1);
    expect(subscriptionService.getEffectivePrice(16)).toBe(expectedForOneExtra);
  });
});
