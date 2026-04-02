import request from 'supertest';
import jwt from 'jsonwebtoken';

const mockUserFindUnique = jest.fn();
const mockDocumentFindMany = jest.fn();
const mockDocumentFindFirst = jest.fn();
const mockDocumentCreate = jest.fn();
const mockDocumentUpdate = jest.fn();
const mockDocumentDelete = jest.fn();
const mockAnalysisCreate = jest.fn();
const mockUploadDocument = jest.fn().mockResolvedValue('documents/user-123/file.pdf');
const mockGetSignedUrl = jest.fn().mockResolvedValue('https://s3.example.com/signed-url');
const mockDeleteDocument = jest.fn().mockResolvedValue(undefined);
const mockCheckDocumentLimit = jest.fn().mockResolvedValue(undefined);
const mockIncrementDocumentCount = jest.fn().mockResolvedValue(undefined);

jest.mock('../../src/models/prisma', () => ({
  prisma: {
    user: { findUnique: mockUserFindUnique },
    document: {
      findMany: mockDocumentFindMany,
      findFirst: mockDocumentFindFirst,
      create: mockDocumentCreate,
      update: mockDocumentUpdate,
      delete: mockDocumentDelete,
    },
    analysis: { create: mockAnalysisCreate },
  },
}));

jest.mock('../../src/services/storage', () => ({
  storageService: {
    uploadDocument: mockUploadDocument,
    getSignedUrl: mockGetSignedUrl,
    deleteDocument: mockDeleteDocument,
  },
}));

jest.mock('../../src/services/ocr', () => ({
  ocrService: { extractText: jest.fn().mockResolvedValue('Extracted text') },
}));

jest.mock('../../src/services/ai', () => ({
  aiService: {
    analyzeDocument: jest.fn().mockResolvedValue({
      summary: 'Summary', riskScore: 20, risks: [], clauses: [],
      suggestions: [], redlines: [], model: 'gpt-4', processingTime: 100,
    }),
  },
}));

jest.mock('../../src/services/subscription', () => ({
  subscriptionService: {
    checkDocumentLimit: mockCheckDocumentLimit,
    incrementDocumentCount: mockIncrementDocumentCount,
  },
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import app from '../../src/app';

const TEST_JWT_SECRET = 'test-jwt-secret';
const TEST_USER_ID = 'user-123';
const testUser = { id: TEST_USER_ID, role: 'CONSUMER', emailVerified: true };
const testDoc = {
  id: 'doc-abc',
  userId: TEST_USER_ID,
  fileName: 'contract.pdf',
  originalName: 'contract.pdf',
  mimeType: 'application/pdf',
  fileSize: 2048,
  s3Key: 'documents/user-123/contract.pdf',
  s3Url: 'https://s3.example.com/contract.pdf',
  status: 'ANALYZED',
  analysis: null,
  notarization: null,
};

function authHeader() {
  return `Bearer ${jwt.sign({ userId: TEST_USER_ID, role: 'CONSUMER' }, TEST_JWT_SECRET)}`;
}

beforeAll(() => { process.env.JWT_SECRET = TEST_JWT_SECRET; });
beforeEach(() => {
  jest.clearAllMocks();
  mockUserFindUnique.mockImplementation(({ where }: any) =>
    Promise.resolve(where.id === TEST_USER_ID ? testUser : null),
  );
});

describe('GET /api/v1/documents', () => {
  it('returns the list of documents for the authenticated user', async () => {
    mockDocumentFindMany.mockResolvedValue([testDoc]);

    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(1);
    expect(res.body.documents[0].id).toBe('doc-abc');
  });

  it('returns an empty array when the user has no documents', async () => {
    mockDocumentFindMany.mockResolvedValue([]);

    const res = await request(app)
      .get('/api/v1/documents')
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.documents).toHaveLength(0);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get('/api/v1/documents');
    expect(res.status).toBe(401);
  });
});

describe('POST /api/v1/documents/upload', () => {
  it('uploads a PDF and returns the created document', async () => {
    mockDocumentCreate.mockResolvedValue(testDoc);
    mockDocumentUpdate.mockResolvedValue(testDoc);

    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', authHeader())
      .attach('file', Buffer.from('%PDF-1.4 test'), {
        filename: 'contract.pdf',
        contentType: 'application/pdf',
      });

    expect(res.status).toBe(201);
    expect(res.body.document).toHaveProperty('id');
    expect(mockUploadDocument).toHaveBeenCalledWith(
      expect.any(Buffer),
      'contract.pdf',
      'application/pdf',
      TEST_USER_ID,
    );
    expect(mockCheckDocumentLimit).toHaveBeenCalledWith(TEST_USER_ID);
    expect(mockIncrementDocumentCount).toHaveBeenCalledWith(TEST_USER_ID);
  });

  it('returns 400 when no file is attached', async () => {
    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', authHeader());

    expect(res.status).toBe(400);
  });

  it('returns 403 when the subscription limit is exceeded', async () => {
    mockCheckDocumentLimit.mockRejectedValue(
      Object.assign(new Error('Trial limit reached'), { statusCode: 403, isOperational: true }),
    );

    const res = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', authHeader())
      .attach('file', Buffer.from('data'), { filename: 'test.pdf', contentType: 'application/pdf' });

    expect(res.status).toBe(403);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).post('/api/v1/documents/upload');
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/documents/:id', () => {
  it('returns the document for the authenticated user', async () => {
    mockDocumentFindFirst.mockResolvedValue(testDoc);

    const res = await request(app)
      .get(`/api/v1/documents/${testDoc.id}`)
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body.document).toHaveProperty('id', testDoc.id);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/documents/nonexistent')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).get(`/api/v1/documents/${testDoc.id}`);
    expect(res.status).toBe(401);
  });
});

describe('DELETE /api/v1/documents/:id', () => {
  it('deletes the document and removes it from S3', async () => {
    mockDocumentFindFirst.mockResolvedValue(testDoc);
    mockDocumentDelete.mockResolvedValue(testDoc);

    const res = await request(app)
      .delete(`/api/v1/documents/${testDoc.id}`)
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(mockDeleteDocument).toHaveBeenCalledWith(testDoc.s3Key);
    expect(mockDocumentDelete).toHaveBeenCalled();
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .delete('/api/v1/documents/nonexistent')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });

  it('returns 401 without an auth token', async () => {
    const res = await request(app).delete(`/api/v1/documents/${testDoc.id}`);
    expect(res.status).toBe(401);
  });
});

describe('GET /api/v1/documents/:id/download', () => {
  it('returns a signed download URL expiring in 300 seconds', async () => {
    mockDocumentFindFirst.mockResolvedValue(testDoc);

    const res = await request(app)
      .get(`/api/v1/documents/${testDoc.id}/download`)
      .set('Authorization', authHeader());

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('downloadUrl');
    expect(res.body).toHaveProperty('expiresIn', 300);
    expect(mockGetSignedUrl).toHaveBeenCalledWith(testDoc.s3Key, 300);
  });

  it('returns 404 when the document does not exist', async () => {
    mockDocumentFindFirst.mockResolvedValue(null);

    const res = await request(app)
      .get('/api/v1/documents/nonexistent/download')
      .set('Authorization', authHeader());

    expect(res.status).toBe(404);
  });
});
