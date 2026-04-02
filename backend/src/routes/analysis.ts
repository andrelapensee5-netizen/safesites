import { Router, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { aiService } from '../services/ai';
import { createError } from '../middleware/errorHandler';

export const analysisRouter = Router();

/**
 * @openapi
 * /api/v1/analysis/{documentId}:
 *   get:
 *     summary: Get analysis for a document
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 */
analysisRouter.get('/:documentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, userId: req.userId! },
      include: { analysis: true },
    });

    if (!document) throw createError('Document not found', 404);
    if (!document.analysis) throw createError('Analysis not yet available', 202);

    res.json({ analysis: document.analysis });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/analysis/{documentId}/retry:
 *   post:
 *     summary: Re-run analysis for a document
 *     tags: [Analysis]
 *     security:
 *       - bearerAuth: []
 */
analysisRouter.post('/:documentId/retry', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, userId: req.userId! },
    });

    if (!document) throw createError('Document not found', 404);
    if (!document.ocrText) throw createError('Document text not available for re-analysis', 400);

    // Delete existing analysis if present
    await prisma.analysis.deleteMany({ where: { documentId: document.id } });

    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'PROCESSING' },
    });

    const analysis = await aiService.analyzeDocument(document.ocrText, document.originalName);

    const saved = await prisma.analysis.create({
      data: { documentId: document.id, ...analysis },
    });

    await prisma.document.update({
      where: { id: document.id },
      data: { status: 'ANALYZED' },
    });

    res.json({ analysis: saved });
  } catch (err) {
    next(err);
  }
});
