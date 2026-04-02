import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockUserFindUnique = jest.fn();
const mockDocumentFindFirst = jest.fn();
const mockNotarizationFindUnique = jest.fn();
const mockNotarizationCreate = jest.fn();
const mockNotarizationUpdate = jest.fn();
const mockInitiateNotarization = jest.fn().mockResolvedValue({ id: 'job-123', status: 'pending' });
const mockCheckStatus = jest.fn().mockResolvedValue({
  id: 'job-123',
  status: 'completed',
  notaryName: 'J. Notary',
  certNumber: 'CERT-001',
  completedAt: new Date().toISOString(),
});

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    document: { findFirst: mockDocumentFindFirst },
    notarization: {
      findUnique: mockNotarizationFindUnique,
      create: mockNotarizationCreate,
      update: mockNotarizationUpdate,
    },
  },
}));

jest.mock('../../src/services/notarization', () => ({
  notarizationService: {
    initiateNotarization: mockInitiateNotarization,
    checkStatus: mockCheckStatus,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'user-123';
const testUser = { id: TEST_USER_ID, role: 'CONSUMER', emailVerified: true };
const analyzedDoc = {
  id: 'doc-abc',
  userId: TEST_USER_ID,
  status: 'ANALYZED',
  originalName: 'contract.pdf',
  s3Key: 'documents/user-123/contract.pdf',
};

function authHeader() {
  return `Bearer ${jwt.sign({ userId: TEST_USER_ID, role: 'CONSUMER' }, TEST_JWT_SECRET)}`;
}

beforeAll(() => { process.env.JWT_SECRET = TEST_JWT_SECRET; });
beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(testUser);
});

describe('POST /api/v1/notarizations/:documentId', () => {
  it('initiates notarization for an ANALYZED document', async () => {
    mockDocumentFindFirst.mockResolvedValue(analyzedDoc);
    mockNotarizationFindUnique.mockResolvedValue(null);
    mockNotarizationCreate.mockResolvedValue({
      id: 'notarization-1',
      documentId: 'doc-abc',
      notarizeJobId: 'job-123',
      status: 'pending',
    });

    const res = await request(app)
      .post('/api/v1/notarizations/doc-abc')
      .set('Authorization', authHeader());

    expect(res.status).toBe(201);
    expect(res.body.notarization).toHaveProperty('status', 'pending');
    expect(mockInitiateNotarization).toHaveBeenCalledWith(analyzedDoc);
  });

  it('returns 400 when the document status is not ANALYZED', async () => {
    mockDocumentFindFirst.mockResolvedValue({ ...analyzedDoc, status: 'PROCESSING' });

    const res = await request(app)
      .post('/api/v1/notarizations/doc-abc')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/notarizations/nonexistent')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 409 when notarization has already been initiated', async () => {
    mockDocumentFindFirst.mockResolvedValue(analyzedDoc);
    mockNotarizationFindUnique.mockResolvedValue({ id: 'existing-notarization' });

    const res = await request(app)
      .post('/api/v1/notarizations/doc-abc')
      .set('Authorization', authHeader());

    expect(res.status).toBe(409);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).post('/api/v1/notarizations/doc-abc');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/notarizations/:documentId/status', () => {
  it('returns the current notarization status', async () => {
    mockDocumentFindFirst.mockResolvedValue(analyzedDoc);
    mockNotarizationFindUnique.mockResolvedValue({
      id: 'notarization-1',
      documentId: 'doc-abc',
      notarizeJobId: 'job-123',
      status: 'completed',
    });
    mockNotarizationUpdate.mockResolvedValue({});

    const res = await request(app)
      .get('/api/v1/notarizations/doc-abc/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.notarization).toHaveProperty('status');
  });

  it('polls for an update when status is still pending', async () => {
    mockDocumentFindFirst.mockResolvedValue(analyzedDoc);
    mockNotarizationFindUnique.mockResolvedValue({
      id: 'notarization-1',
      documentId: 'doc-abc',
      notarizeJobId: 'job-123',
      status: 'pending',
    });
    mockNotarizationUpdate.mockResolvedValue({});

    const res = await request(app)
      .get('/api/v1/notarizations/doc-abc/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(mockCheckStatus).toHaveBeenCalledWith('job-123');
  });

  it('returns 404 when no notarization record exists', async () => {
    mockDocumentFindFirst.mockResolvedValue(analyzedDoc);
    mockNotarizationFindUnique.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/notarizations/doc-abc/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/notarizations/nonexistent/status')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/api/v1/notarizations/doc-abc/status');
    expect(res.status).toBe(401);
  });
});
