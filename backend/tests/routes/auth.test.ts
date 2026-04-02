import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

const mockUserFindUnique = jest.fn();
const mockUserFindFirst = jest.fn();
const mockUserCreate = jest.fn();
const mockUserUpdate = jest.fn();
const mockAuditLogCreate = jest.fn();
const mockSendVerificationEmail = jest.fn().mockResolvedValue(undefined);
const mockSendPasswordResetEmail = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: {
      findUnique: mockUserFindUnique,
      findFirst: mockUserFindFirst,
      create: mockUserCreate,
      update: mockUserUpdate,
    },
    auditLog: { create: mockAuditLogCreate },
  },
}));

jest.mock('../../src/services/email', () => ({
  emailService: {
    sendVerificationEmail: mockSendVerificationEmail,
    sendPasswordResetEmail: mockSendPasswordResetEmail,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_REFRESH_SECRET = 'test-refresh-secret';

beforeAll(() => {
  process.env.JWT_SECRET = TEST_JWT_SECRET;
  process.env.JWT_REFRESH_SECRET = TEST_REFRESH_SECRET;
});

beforeEach(() => jest.clearAllMocks());

describe('POST /api/v1/auth/register', () => {
  it('registers a new user and sends a verification email', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({
      id: 'user-123',
      email: 'new@example.com',
      firstName: 'John',
      emailVerifyToken: 'verify-token',
    });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'new@example.com', password: 'SecurePass123', firstName: 'John', lastName: 'Doe' });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('userId', 'user-123');
    expect(mockSendVerificationEmail).toHaveBeenCalledTimes(1);
  });

  it('sets the role to CONSUMER when not specified', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: 'u1', email: 'a@b.com', firstName: 'F', emailVerifyToken: 't' });

    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'SecurePass123', firstName: 'F', lastName: 'L' });

    expect(mockUserCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ role: 'CONSUMER' }) }),
    );
  });

  it('accepts a LAWYER role', async () => {
    mockUserFindUnique.mockResolvedValue(null);
    mockUserCreate.mockResolvedValue({ id: 'u2', email: 'l@b.com', firstName: 'L', emailVerifyToken: 't' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'l@b.com', password: 'SecurePass123', firstName: 'L', lastName: 'L', role: 'LAWYER' });

    expect(res.status).toBe(201);
  });

  it('returns 409 when email is already registered', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'existing', email: 'taken@example.com' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'taken@example.com', password: 'SecurePass123', firstName: 'A', lastName: 'B' });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain('already registered');
  });

  it('returns 400 for an invalid email format', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'SecurePass123', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when password is shorter than 8 characters', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'short', firstName: 'A', lastName: 'B' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when firstName is missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'a@b.com', password: 'SecurePass123', lastName: 'B' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/login', () => {
  async function makeUserWithHash(password: string) {
    const hash = await bcrypt.hash(password, 12);
    return {
      id: 'user-123',
      email: 'user@example.com',
      passwordHash: hash,
      emailVerified: true,
      role: 'CONSUMER',
      subscriptionStatus: 'TRIALING',
      trialEndsAt: new Date(Date.now() + 86400000),
      firstName: 'John',
      lastName: 'Doe',
    };
  }

  it('returns access and refresh tokens for valid credentials', async () => {
    mockUserFindUnique.mockResolvedValue(await makeUserWithHash('CorrectPass1'));
    mockAuditLogCreate.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'CorrectPass1' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user).toHaveProperty('email', 'user@example.com');
  });

  it('returns 401 for wrong password', async () => {
    mockUserFindUnique.mockResolvedValue(await makeUserWithHash('CorrectPass1'));

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'user@example.com', password: 'WrongPass' });

    expect(res.status).toBe(401);
  });

  it('returns 401 for a non-existent email', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'AnyPass123' });

    expect(res.status).toBe(401);
  });

  it('returns 403 when email is not verified', async () => {
    const hash = await bcrypt.hash('Pass1234', 12);
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'u@e.com', passwordHash: hash, emailVerified: false });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'u@e.com', password: 'Pass1234' });

    expect(res.status).toBe(403);
  });

  it('returns 400 for missing email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ password: 'SomePass123' });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/v1/auth/verify-email', () => {
  it('verifies email with a valid token', async () => {
    mockUserFindFirst.mockResolvedValue({ id: 'u1' });
    mockUserUpdate.mockResolvedValue({});

    const res = await request(app).get('/api/v1/auth/verify-email').query({ token: 'valid-token' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('verified');
  });

  it('returns 400 for an invalid or missing token', async () => {
    mockUserFindFirst.mockResolvedValue(null);
    const res = await request(app).get('/api/v1/auth/verify-email').query({ token: 'bad' });
    expect(res.status).toBe(400);
  });

  it('returns 400 when token query param is absent', async () => {
    const res = await request(app).get('/api/v1/auth/verify-email');
    expect(res.status).toBe(400);
  });
});

describe('POST /api/v1/auth/refresh', () => {
  it('returns a new access token given a valid refresh token', async () => {
    const refreshToken = jwt.sign({ userId: 'user-123' }, TEST_REFRESH_SECRET);
    mockUserFindUnique.mockResolvedValue({ id: 'user-123', role: 'CONSUMER' });

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('accessToken');
  });

  it('returns 400 when refresh token is missing', async () => {
    const res = await request(app).post('/api/v1/auth/refresh').send({});
    expect(res.status).toBe(400);
  });

  it('returns an error for an invalid refresh token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'bad.token.here' });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});

describe('POST /api/v1/auth/forgot-password', () => {
  it('always returns success to prevent email enumeration', async () => {
    mockUserFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ghost@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('If that email exists');
  });

  it('sends a reset email when the user exists', async () => {
    mockUserFindUnique.mockResolvedValue({ id: 'u1', email: 'user@example.com', firstName: 'John' });
    mockUserUpdate.mockResolvedValue({});

    await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      'user@example.com',
      'John',
      expect.any(String),
    );
  });
});

describe('POST /api/v1/auth/reset-password', () => {
  it('resets password when token is valid and not expired', async () => {
    mockUserFindFirst.mockResolvedValue({
      id: 'u1',
      resetToken: 'valid-token',
      resetTokenExpiry: new Date(Date.now() + 3600000),
    });
    mockUserUpdate.mockResolvedValue({});

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'valid-token', password: 'NewStrongPass1' });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain('reset successfully');
  });

  it('returns 400 for an invalid or expired token', async () => {
    mockUserFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bad-token', password: 'NewStrongPass1' });

    expect(res.status).toBe(400);
  });

  it('returns 400 when the new password is too short', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'some-token', password: 'weak' });
    expect(res.status).toBe(400);
  });
});
