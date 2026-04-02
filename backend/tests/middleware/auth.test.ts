import { Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole, AuthRequest } from '../../src/middleware/auth';

// Use jest.fn() inside the factory to avoid hoisting issues with outer variables.
jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

// Obtain a typed reference to the mock after module resolution.
import { prisma } from '../../src/models/prisma';
const mockFindUnique = prisma.user.findUnique as jest.Mock;

const TEST_SECRET = 'test-jwt-secret';

const testUser = { id: 'user-123', role: 'CONSUMER', emailVerified: true };

describe('authenticate middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = { headers: {} };
    mockRes = {};
    mockNext = jest.fn();
    process.env.JWT_SECRET = TEST_SECRET;
    jest.clearAllMocks();
  });

  it('sets userId and userRole and calls next() for a valid token', async () => {
    const token = jwt.sign({ userId: testUser.id, role: testUser.role }, TEST_SECRET);
    mockReq.headers = { authorization: `Bearer ${token}` };
    mockFindUnique.mockResolvedValue(testUser);

    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalledWith();
    expect(mockReq.userId).toBe(testUser.id);
    expect(mockReq.userRole).toBe(testUser.role);
  });

  it('calls next with 401 error when no authorization header is present', async () => {
    mockReq.headers = {};
    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 401 when authorization does not start with Bearer', async () => {
    mockReq.headers = { authorization: 'Token some-token' };
    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with an error when token is invalid or malformed', async () => {
    mockReq.headers = { authorization: 'Bearer not.a.valid.token' };
    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with an error when token is signed with the wrong secret', async () => {
    const token = jwt.sign({ userId: 'user-123', role: 'CONSUMER' }, 'wrong-secret');
    mockReq.headers = { authorization: `Bearer ${token}` };
    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });

  it('calls next with 401 when user does not exist in database', async () => {
    const token = jwt.sign({ userId: 'nonexistent-id', role: 'CONSUMER' }, TEST_SECRET);
    mockReq.headers = { authorization: `Bearer ${token}` };
    mockFindUnique.mockResolvedValue(null);

    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('calls next with 403 when user email is not verified', async () => {
    const token = jwt.sign({ userId: 'user-123', role: 'CONSUMER' }, TEST_SECRET);
    mockReq.headers = { authorization: `Bearer ${token}` };
    mockFindUnique.mockResolvedValue({ ...testUser, emailVerified: false });

    await authenticate(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});

describe('requireRole middleware', () => {
  let mockReq: Partial<AuthRequest>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  it('calls next() when user has the required role', () => {
    mockReq.userRole = 'LAWYER';
    requireRole('LAWYER')(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next() when user has one of the allowed roles', () => {
    mockReq.userRole = 'CONSUMER';
    requireRole('CONSUMER', 'LAWYER')(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith();
  });

  it('calls next with 403 when user has an incorrect role', () => {
    mockReq.userRole = 'CONSUMER';
    requireRole('LAWYER')(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('calls next with 403 when userRole is not set', () => {
    mockReq.userRole = undefined;
    requireRole('CONSUMER')(mockReq as AuthRequest, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });
});
