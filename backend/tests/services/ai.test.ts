const mockCreate = jest.fn();

jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
);

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { aiService } from '../../src/services/ai';

const mockAnalysis = {
  summary: 'This is a rental agreement.',
  riskScore: 42,
  risks: [{ type: 'indemnification', severity: 'medium', description: 'Broad clause' }],
  clauses: [{ name: 'Payment', text: 'Due in 30 days', explanation: 'Standard term' }],
  suggestions: [{ type: 'modification', description: 'Narrow scope', priority: 'high' }],
  redlines: [{ original: 'any claim', suggested: 'any direct claim', reason: 'Too broad' }],
};

function mockSuccess(data = mockAnalysis) {
  mockCreate.mockResolvedValue({
    choices: [{ message: { content: JSON.stringify(data) } }],
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  process.env.OPENAI_MODEL = 'gpt-4-turbo-preview';
});

describe('aiService.analyzeDocument', () => {
  it('returns a fully populated analysis result', async () => {
    mockSuccess();
    const result = await aiService.analyzeDocument('Contract text', 'contract.pdf');
    expect(result.summary).toBe(mockAnalysis.summary);
    expect(result.riskScore).toBe(mockAnalysis.riskScore);
    expect(result.risks).toHaveLength(1);
    expect(result.clauses).toHaveLength(1);
    expect(result.suggestions).toHaveLength(1);
    expect(result.redlines).toHaveLength(1);
    expect(result.model).toBeDefined();
    expect(result.processingTime).toBeGreaterThanOrEqual(0);
  });

  it('clamps riskScore above 100 down to 100', async () => {
    mockSuccess({ ...mockAnalysis, riskScore: 200 });
    const result = await aiService.analyzeDocument('text', 'file.pdf');
    expect(result.riskScore).toBe(100);
  });

  it('clamps riskScore below 0 up to 0', async () => {
    mockSuccess({ ...mockAnalysis, riskScore: -50 });
    const result = await aiService.analyzeDocument('text', 'file.pdf');
    expect(result.riskScore).toBe(0);
  });

  it('defaults missing array fields to empty arrays', async () => {
    mockSuccess({ riskScore: 30 } as any);
    const result = await aiService.analyzeDocument('text', 'file.pdf');
    expect(result.summary).toBe('');
    expect(result.risks).toEqual([]);
    expect(result.clauses).toEqual([]);
    expect(result.suggestions).toEqual([]);
    expect(result.redlines).toEqual([]);
  });

  it('truncates text longer than 15000 characters and appends [truncated]', async () => {
    mockSuccess();
    const longText = 'x'.repeat(20000);
    await aiService.analyzeDocument(longText, 'large.pdf');
    const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userContent).toContain('[truncated]');
  });

  it('does not truncate text under 15000 characters', async () => {
    mockSuccess();
    await aiService.analyzeDocument('short text', 'small.pdf');
    const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userContent).not.toContain('[truncated]');
  });

  it('throws when OpenAI returns null content', async () => {
    mockCreate.mockResolvedValue({ choices: [{ message: { content: null } }] });
    await expect(aiService.analyzeDocument('text', 'file.pdf')).rejects.toThrow(
      'Empty response from OpenAI',
    );
  });

  it('propagates OpenAI API errors', async () => {
    mockCreate.mockRejectedValue(new Error('OpenAI API failure'));
    await expect(aiService.analyzeDocument('text', 'file.pdf')).rejects.toThrow(
      'OpenAI API failure',
    );
  });

  it('includes the file name in the prompt sent to OpenAI', async () => {
    mockSuccess();
    await aiService.analyzeDocument('some text', 'my-contract.pdf');
    const userContent = mockCreate.mock.calls[0][0].messages[1].content as string;
    expect(userContent).toContain('my-contract.pdf');
  });
});
