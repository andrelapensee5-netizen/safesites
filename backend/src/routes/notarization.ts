import { Router, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { notarizationService } from '../services/notarization';
import { createError } from '../middleware/errorHandler';

export const notarizationRouter = Router();

/**
 * @openapi
 * /api/v1/notarizations/{documentId}:
 *   post:
 *     summary: Initiate notarization for a document
 *     tags: [Notarization]
 *     security:
 *       - bearerAuth: []
 */
notarizationRouter.post('/:documentId', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, userId: req.userId! },
    });

    if (!document) throw createError('Document not found', 404);
    if (document.status !== 'ANALYZED') throw createError('Document must be analyzed before notarization', 400);

    const existing = await prisma.notarization.findUnique({ where: { documentId: document.id } });
    if (existing) throw createError('Notarization already initiated', 409);

    const job = await notarizationService.initiateNotarization(document);

    const notarization = await prisma.notarization.create({
      data: {
        documentId: document.id,
        notarizeJobId: job.id,
        status: 'pending',
      },
    });

    res.status(201).json({ notarization });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/notarizations/{documentId}/status:
 *   get:
 *     summary: Get notarization status
 *     tags: [Notarization]
 *     security:
 *       - bearerAuth: []
 */
notarizationRouter.get('/:documentId/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.documentId, userId: req.userId! },
    });

    if (!document) throw createError('Document not found', 404);

    const notarization = await prisma.notarization.findUnique({
      where: { documentId: document.id },
    });

    if (!notarization) throw createError('No notarization found for this document', 404);

    // Poll status from NotarizeMe if still pending
    if (notarization.status === 'pending' && notarization.notarizeJobId) {
      const status = await notarizationService.checkStatus(notarization.notarizeJobId);
      if (status.status !== notarization.status) {
        await prisma.notarization.update({
          where: { id: notarization.id },
          data: {
            status: status.status,
            completedAt: status.completedAt,
            notaryName: status.notaryName,
            certNumber: status.certNumber,
          },
        });
      }
    }

    res.json({ notarization });
  } catch (err) {
    next(err);
  }
});
