const mockSendMail = jest.fn().mockResolvedValue({ messageId: 'test-id' });

jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({ sendMail: mockSendMail }),
}));

jest.mock('../../src/utils/logger', () => ({
  logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), http: jest.fn() },
}));

import { emailService } from '../../src/services/email';

beforeEach(() => {
  jest.clearAllMocks();
  process.env.FRONTEND_URL = 'http://localhost:3000';
  process.env.EMAIL_FROM = 'noreply@safesites.com';
});

describe('emailService.sendVerificationEmail', () => {
  it('sends an email to the given address', async () => {
    await emailService.sendVerificationEmail('user@example.com', 'John', 'token-abc');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('uses the correct subject', async () => {
    await emailService.sendVerificationEmail('user@example.com', 'John', 'token-abc');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Verify your SafeSite account' }),
    );
  });

  it('includes the verification URL with token in the email body', async () => {
    await emailService.sendVerificationEmail('user@example.com', 'John', 'my-verify-token');
    const args = mockSendMail.mock.calls[0][0];
    expect(args.html).toContain('my-verify-token');
    expect(args.html).toContain('http://localhost:3000/verify-email');
  });

  it('personalizes the email with the user name', async () => {
    await emailService.sendVerificationEmail('user@example.com', 'Alice', 'token');
    const args = mockSendMail.mock.calls[0][0];
    expect(args.html).toContain('Alice');
  });
});

describe('emailService.sendPasswordResetEmail', () => {
  it('sends an email to the given address', async () => {
    await emailService.sendPasswordResetEmail('user@example.com', 'Bob', 'reset-token');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'user@example.com' }),
    );
  });

  it('uses the correct subject', async () => {
    await emailService.sendPasswordResetEmail('user@example.com', 'Bob', 'reset-token');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: 'Reset your SafeSite password' }),
    );
  });

  it('includes the reset URL with token in the email body', async () => {
    await emailService.sendPasswordResetEmail('user@example.com', 'Bob', 'my-reset-token');
    const args = mockSendMail.mock.calls[0][0];
    expect(args.html).toContain('my-reset-token');
    expect(args.html).toContain('http://localhost:3000/reset-password');
  });
});

describe('emailService.sendDocumentReadyEmail', () => {
  it('sends an email containing the document name in the subject', async () => {
    await emailService.sendDocumentReadyEmail('user@example.com', 'Carol', 'contract.pdf');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ subject: expect.stringContaining('contract.pdf') }),
    );
  });

  it('sends to the correct recipient', async () => {
    await emailService.sendDocumentReadyEmail('carol@example.com', 'Carol', 'nda.pdf');
    expect(mockSendMail).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'carol@example.com' }),
    );
  });
});
