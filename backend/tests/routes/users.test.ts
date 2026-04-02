import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

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

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'user-123';

const testUser = {
  id: TEST_USER_ID,
  email: 'user@example.com',
  firstName: 'John',
  lastName: 'Doe',
  role: 'CONSUMER',
  emailVerified: true,
  subscriptionStatus: 'ACTIVE',
  trialEndsAt: null,
  documentsThisMonth: 3,
  billingCycleStart: new Date().toISOString(),
  createdAt: new Date().toISOString(),
};

function createToken(userId = TEST_USER_ID, role = 'CONSUMER') {
  return jwt.sign({ userId, role }, TEST_JWT_SECRET);
}

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
});

beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockImplementation(({ where }: any) =>
    Promise.resolve(where.id === TEST_USER_ID ? testUser : null),
  );
});

describe('GET /api/v1/users/me', () => {
  it('returns the authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${createToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.user).toHaveProperty('id', TEST_USER_ID);
    expect(res.body.user).toHaveProperty('email', 'user@example.com');
    expect(res.body.user).not.toHaveProperty('passwordHash');
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/users/me', () => {
  it('updates firstName and lastName', async () => {
    mockUserUpdate.mockResolvedValue({ ...testUser, firstName: 'Jane', lastName: 'Smith' });

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ firstName: 'Jane', lastName: 'Smith' });

    expect(res.status).toBe(200);
    expect(mockUserUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ firstName: 'Jane' }) }),
    );
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app).patch('/api/v1/users/me').send({ firstName: 'Jane' });
    expect(res.status).toBe(401);
  });
});

describe('PATCH /api/v1/users/me/password', () => {
  async function setupUserWithPassword(password: string) {
    const passwordHash = await bcrypt.hash(password, 12);
    mockUserFindUnique.mockImplementation(({ where }: any) =>
      Promise.resolve(where.id === TEST_USER_ID ? { ...testUser, passwordHash } : null),
    );
  }

  it('changes the password when current password is correct', async () => {
    await setupUserWithPassword('OldPass123');
    mockUserUpdate.mockResolvedValue({});

    const res = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ currentPassword: 'OldPass123', newPassword: 'NewStrongPass1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('updated');
  });

  it('returns 400 when the current password is wrong', async () => {
    await setupUserWithPassword('OldPass123');

    const res = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ currentPassword: 'WrongPass', newPassword: 'NewStrongPass1' });

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('incorrect');
  });

  it('returns 400 when new password is shorter than 8 characters', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/password')
      .set('Authorization', `Bearer ${createToken()}`)
      .send({ currentPassword: 'OldPass123', newPassword: 'weak' });

    expect(res.status).toBe(400);
  });

  it('returns 401 when no token is provided', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me/password')
      .send({ currentPassword: 'OldPass123', newPassword: 'NewStrongPass1' });
    expect(res.status).toBe(401);
  });
});
