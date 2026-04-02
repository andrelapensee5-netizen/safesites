const mockFetch = jest.fn();
global.fetch = mockFetch as typeof fetch;

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { notarizationService } from '../../src/services/notarization';

const mockDoc = {
  id: 'doc-abc',
  originalName: 'contract.pdf',
  s3Key: 'documents/user-1/contract.pdf',
} as any;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('notarizationService.initiateNotarization', () => {
  it('posts to the sessions endpoint and returns the job', async () => {
    const job = { id: 'job-123', status: 'pending' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue(job),
    });

    const result = await notarizationService.initiateNotarization(mockDoc);
    expect(result.id).toBe('job-123');
    expect(result.status).toBe('pending');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.notarizeme.com/v1/sessions',
      expect.objectContaining({ method: 'POST' }),
    );
  });

  it('sends the Authorization header with the API key', async () => {
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ id: 'j1', status: 'pending' }) });
    await notarizationService.initiateNotarization(mockDoc);
    const headers = (mockFetch.mock.calls[0][1] as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-notarize-key');
  });

  it('throws when the API responds with a non-ok status', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Bad Request' });
    await expect(notarizationService.initiateNotarization(mockDoc)).rejects.toThrow(
      'NotarizeMe API error',
    );
  });

  it('propagates network errors', async () => {
    mockFetch.mockRejectedValue(new Error('Network failure'));
    await expect(notarizationService.initiateNotarization(mockDoc)).rejects.toThrow(
      'Network failure',
    );
  });
});

describe('notarizationService.checkStatus', () => {
  it('fetches status from the correct endpoint', async () => {
    const status = { id: 'job-123', status: 'completed', notaryName: 'J. Notary', certNumber: 'C-1' };
    mockFetch.mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue(status) });

    const result = await notarizationService.checkStatus('job-123');
    expect(result.status).toBe('completed');
    expect(result.notaryName).toBe('J. Notary');
    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.notarizeme.com/v1/sessions/job-123',
      expect.anything(),
    );
  });

  it('throws when the status check returns a non-ok response', async () => {
    mockFetch.mockResolvedValue({ ok: false, statusText: 'Not Found' });
    await expect(notarizationService.checkStatus('job-999')).rejects.toThrow(
      'NotarizeMe status check failed',
    );
  });
});
