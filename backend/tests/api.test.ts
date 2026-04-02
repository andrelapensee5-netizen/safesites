import request from 'supertest';
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
