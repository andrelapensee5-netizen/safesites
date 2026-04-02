import { Router, Response, NextFunction } from 'express';
import multer from 'multer';
import { prisma } from '../models/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { storageService } from '../services/storage';
import { ocrService } from '../services/ocr';
import { aiService } from '../services/ai';
import { createError } from '../middleware/errorHandler';
import { subscriptionService } from '../services/subscription';

export const documentsRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  },
});

/**
 * @openapi
 * /api/v1/documents:
 *   get:
 *     summary: List user documents
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of documents
 */
documentsRouter.get('/', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const documents = await prisma.document.findMany({
      where: { userId: req.userId!, parentId: null },
      include: { analysis: true },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ documents });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/documents/upload:
 *   post:
 *     summary: Upload a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 */
documentsRouter.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.file) throw createError('No file uploaded', 400);

      // Check subscription/usage limits
      await subscriptionService.checkDocumentLimit(req.userId!);

      // Upload to S3
      const s3Key = await storageService.uploadDocument(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        req.userId!,
      );

      const s3Url = await storageService.getSignedUrl(s3Key);

      const document = await prisma.document.create({
        data: {
          userId: req.userId!,
          fileName: `${Date.now()}-${req.file.originalname}`,
          originalName: req.file.originalname,
          mimeType: req.file.mimetype,
          fileSize: req.file.size,
          s3Key,
          s3Url,
          status: 'PROCESSING',
        },
      });

      // Increment usage counter
      await subscriptionService.incrementDocumentCount(req.userId!);

      // Run OCR asynchronously
      setImmediate(async () => {
        try {
          const ocrText = await ocrService.extractText(req.file!.buffer, req.file!.mimetype);
          await prisma.document.update({
            where: { id: document.id },
            data: { ocrText, status: 'ANALYZED' },
          });

          // Run AI analysis
          const analysis = await aiService.analyzeDocument(ocrText, req.file!.originalname);
          await prisma.analysis.create({
            data: {
              documentId: document.id,
              ...analysis,
            },
          });
        } catch (err) {
          await prisma.document.update({
            where: { id: document.id },
            data: { status: 'FAILED' },
          });
        }
      });

      res.status(201).json({ document });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   get:
 *     summary: Get document by ID
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 */
documentsRouter.get('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.userId! },
      include: { analysis: true, notarization: true },
    });

    if (!document) throw createError('Document not found', 404);

    // Refresh signed URL
    const signedUrl = await storageService.getSignedUrl(document.s3Key);

    res.json({ document: { ...document, s3Url: signedUrl } });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/documents/{id}:
 *   delete:
 *     summary: Delete a document
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
documentsRouter.delete('/:id', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!document) throw createError('Document not found', 404);

    await storageService.deleteDocument(document.s3Key);
    await prisma.document.delete({ where: { id: document.id } });

    res.json({ message: 'Document deleted successfully' });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/documents/{id}/download:
 *   get:
 *     summary: Get a signed download URL
 *     tags: [Documents]
 *     security:
 *       - bearerAuth: []
 */
documentsRouter.get('/:id/download', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const document = await prisma.document.findFirst({
      where: { id: req.params.id, userId: req.userId! },
    });

    if (!document) throw createError('Document not found', 404);

    const signedUrl = await storageService.getSignedUrl(document.s3Key, 300); // 5 minutes

    res.json({ downloadUrl: signedUrl, expiresIn: 300 });
  } catch (err) {
    next(err);
  }
});
