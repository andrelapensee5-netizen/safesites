const mockSend = jest.fn().mockResolvedValue({});
const mockGetSignedUrlFn = jest.fn().mockResolvedValue('https://s3.amazonaws.com/signed-url');

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'PutObject' })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'DeleteObject' })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ ...input, _type: 'GetObject' })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: mockGetSignedUrlFn,
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { storageService } from '../../src/services/storage';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.AWS_S3_BUCKET = 'test-bucket';
  process.env.AWS_REGION = 'us-east-1';
});

describe('storageService.uploadDocument', () => {
  it('calls S3 send and returns a key with the correct prefix and extension', async () => {
    const buffer = Buffer.from('file content');
    const key = await storageService.uploadDocument(buffer, 'contract.pdf', 'application/pdf', 'user-123');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(key).toMatch(/^documents\/user-123\/.+\.pdf$/);
  });

  it('preserves the original file extension in the S3 key', async () => {
    const key = await storageService.uploadDocument(
      Buffer.from('img'), 'photo.png', 'image/png', 'user-456',
    );
    expect(key).toMatch(/\.png$/);
  });

  it('generates a unique key on each call', async () => {
    const buffer = Buffer.from('data');
    const key1 = await storageService.uploadDocument(buffer, 'a.pdf', 'application/pdf', 'u1');
    const key2 = await storageService.uploadDocument(buffer, 'a.pdf', 'application/pdf', 'u1');
    expect(key1).not.toBe(key2);
  });
});

describe('storageService.getSignedUrl', () => {
  it('returns the signed URL from the presigner', async () => {
    const url = await storageService.getSignedUrl('documents/user-1/test.pdf');
    expect(url).toBe('https://s3.amazonaws.com/signed-url');
    expect(mockGetSignedUrlFn).toHaveBeenCalledTimes(1);
  });

  it('uses the default expiry of 3600 seconds', async () => {
    await storageService.getSignedUrl('some-key');
    expect(mockGetSignedUrlFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 3600 }),
    );
  });

  it('accepts a custom expiry value', async () => {
    await storageService.getSignedUrl('some-key', 300);
    expect(mockGetSignedUrlFn).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({ expiresIn: 300 }),
    );
  });
});

describe('storageService.deleteDocument', () => {
  it('calls S3 send with a DeleteObjectCommand', async () => {
    await storageService.deleteDocument('documents/user-1/old.pdf');
    expect(mockSend).toHaveBeenCalledTimes(1);
  });
});
