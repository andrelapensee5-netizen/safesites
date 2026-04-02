import request from 'supertest';

jest.mock('../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    document: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), delete: jest.fn() },
    analysis: { create: jest.fn(), deleteMany: jest.fn() },
    auditLog: { create: jest.fn() },
    payment: { findMany: jest.fn(), create: jest.fn() },
    notarization: { findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}));

jest.mock('../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../src/app';

describe('Health Check', () => {
  it('GET /health returns 200', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status', 'ok');
  });
});

describe('Auth Routes', () => {
  it('POST /api/v1/auth/register validates input', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' });
    expect(res.status).toBe(400);
  });

  it('POST /api/v1/auth/login rejects missing credentials', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({});
    expect(res.status).toBe(400);
  });
});

describe('Protected Routes', () => {
  it('GET /api/v1/documents returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/documents');
    expect(res.status).toBe(401);
  });

  it('GET /api/v1/users/me returns 401 without token', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});
