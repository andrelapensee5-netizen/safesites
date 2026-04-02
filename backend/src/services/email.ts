import nodemailer from 'nodemailer';
import { logger } from '../utils/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM = process.env.EMAIL_FROM || 'noreply@safesites.com';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export const emailService = {
  async sendVerificationEmail(to: string, name: string, token: string): Promise<void> {
    const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;

    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Verify your SafeSite account',
      html: `
        <h2>Welcome to SafeSite, ${name}!</h2>
        <p>Please verify your email address by clicking the link below:</p>
        <a href="${verifyUrl}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Verify Email
        </a>
        <p>This link expires in 24 hours.</p>
        <p>If you didn't create an account, please ignore this email.</p>
      `,
    });

    logger.info(`Verification email sent to ${to}`);
  },

  async sendPasswordResetEmail(to: string, name: string, token: string): Promise<void> {
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${token}`;

    await transporter.sendMail({
      from: FROM,
      to,
      subject: 'Reset your SafeSite password',
      html: `
        <h2>Password Reset Request</h2>
        <p>Hi ${name}, you requested a password reset.</p>
        <a href="${resetUrl}" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          Reset Password
        </a>
        <p>This link expires in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    });

    logger.info(`Password reset email sent to ${to}`);
  },

  async sendDocumentReadyEmail(to: string, name: string, documentName: string): Promise<void> {
    await transporter.sendMail({
      from: FROM,
      to,
      subject: `Your document "${documentName}" is ready`,
      html: `
        <h2>Document Analysis Complete</h2>
        <p>Hi ${name}, your document <strong>${documentName}</strong> has been analyzed.</p>
        <a href="${FRONTEND_URL}/documents" style="background:#4F46E5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;">
          View Document
        </a>
      `,
    });
  },
};
