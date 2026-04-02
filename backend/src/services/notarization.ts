import { Document } from '@prisma/client';
import { logger } from '../utils/logger';

interface NotarizationJob {
  id: string;
  status: string;
  completedAt?: Date;
  notaryName?: string;
  certNumber?: string;
}

const NOTARIZEME_URL = process.env.NOTARIZEME_API_URL || 'https://api.notarizeme.com/v1';
const NOTARIZEME_KEY = process.env.NOTARIZEME_API_KEY || '';

export const notarizationService = {
  async initiateNotarization(document: Document): Promise<NotarizationJob> {
    try {
      const response = await fetch(`${NOTARIZEME_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${NOTARIZEME_KEY}`,
        },
        body: JSON.stringify({
          documentId: document.id,
          documentName: document.originalName,
          s3Key: document.s3Key,
        }),
      });

      if (!response.ok) {
        throw new Error(`NotarizeMe API error: ${response.statusText}`);
      }

      const data = await response.json() as NotarizationJob;
      logger.info(`Notarization initiated: ${data.id}`);
      return data;
    } catch (err) {
      logger.error('Failed to initiate notarization:', err);
      throw err;
    }
  },

  async checkStatus(jobId: string): Promise<NotarizationJob> {
    try {
      const response = await fetch(`${NOTARIZEME_URL}/sessions/${jobId}`, {
        headers: { Authorization: `Bearer ${NOTARIZEME_KEY}` },
      });

      if (!response.ok) {
        throw new Error(`NotarizeMe status check failed: ${response.statusText}`);
      }

      return response.json() as Promise<NotarizationJob>;
    } catch (err) {
      logger.error('Failed to check notarization status:', err);
      throw err;
    }
  },
};
