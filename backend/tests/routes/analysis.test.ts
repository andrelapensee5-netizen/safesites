import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockUserFindUnique = jest.fn();
const mockDocumentFindFirst = jest.fn();
const mockDocumentUpdate = jest.fn();
const mockAnalysisCreate = jest.fn();
const mockAnalysisDeleteMany = jest.fn();
const mockAnalyzeDocument = jest.fn().mockResolvedValue({
  summary: 'AI result',
  riskScore: 55,
  risks: [],
  clauses: [],
  suggestions: [],
  redlines: [],
  model: 'gpt-4',
  processingTime: 150,
});

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    document: { findFirst: mockDocumentFindFirst, update: mockDocumentUpdate },
    analysis: { create: mockAnalysisCreate, deleteMany: mockAnalysisDeleteMany },
  },
}));

jest.mock('../../src/services/ai', () => ({
  aiService: { analyzeDocument: mockAnalyzeDocument },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'user-123';
const testUser = { id: TEST_USER_ID, role: 'CONSUMER', emailVerified: true };
const analysisFixture = { id: 'analysis-1', summary: 'Contract summary', riskScore: 30 };

function authHeader() {
  return `Bearer ${jwt.sign({ userId: TEST_USER_ID, role: 'CONSUMER' }, TEST_JWT_SECRET)}`;
}

beforeAll(() => { process.env.JWT_SECRET = TEST_JWT_SECRET; });
beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockResolvedValue(testUser);
});

describe('GET /api/v1/analysis/:documentId', () => {
  it('returns the analysis when it exists', async () => {
    mockDocumentFindFirst.mockResolvedValue({
      id: 'doc-1', userId: TEST_USER_ID, analysis: analysisFixture,
    });

    const res = await request(app)
      .get('/api/v1/analysis/doc-1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.analysis).toHaveProperty('summary', 'Contract summary');
  });

  it('returns 202 when the analysis is not yet available', async () => {
    mockDocumentFindFirst.mockResolvedValue({
      id: 'doc-1', userId: TEST_USER_ID, analysis: null,
    });

    const res = await request(app)
      .get('/api/v1/analysis/doc-1')
      .set('Authorization', authHeader());

    expect(res.status).toBe(202);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/analysis/nonexistent')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/api/v1/analysis/doc-1');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/analysis/:documentId/retry', () => {
  it('re-runs analysis and returns the new result', async () => {
    mockDocumentFindFirst.mockResolvedValue({
      id: 'doc-1', userId: TEST_USER_ID, ocrText: 'Contract full text', originalName: 'contract.pdf',
    });
    mockAnalysisDeleteMany.mockResolvedValue({ count: 1 });
    mockDocumentUpdate.mockResolvedValue({});
    mockAnalysisCreate.mockResolvedValue({ id: 'analysis-2', summary: 'AI result' });

    const res = await request(app)
      .post('/api/v1/analysis/doc-1/retry')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.analysis).toHaveProperty('summary');
    expect(mockAnalysisDeleteMany).toHaveBeenCalledWith({ where: { documentId: 'doc-1' } });
    expect(mockAnalyzeDocument).toHaveBeenCalledWith('Contract full text', 'contract.pdf');
  });

  it('returns 400 when the document has no OCR text to re-analyze', async () => {
    mockDocumentFindFirst.mockResolvedValue({
      id: 'doc-1', userId: TEST_USER_ID, ocrText: null, originalName: 'contract.pdf',
    });

    const res = await request(app)
      .post('/api/v1/analysis/doc-1/retry')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .post('/api/v1/analysis/nonexistent/retry')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).post('/api/v1/analysis/doc-1/retry');
    expect(res.status).toBe(401);
  });
});
