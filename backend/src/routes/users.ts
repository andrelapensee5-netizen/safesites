import { Router, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { prisma } from '../models/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/errorHandler';

export const usersRouter = Router();

/**
 * @openapi
 * /api/v1/users/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
usersRouter.get('/me', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        emailVerified: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        documentsThisMonth: true,
        billingCycleStart: true,
        createdAt: true,
      },
    });

    if (!user) throw createError('User not found', 404);
    res.json({ user });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/users/me:
 *   patch:
 *     summary: Update current user profile
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
usersRouter.patch(
  '/me',
  authenticate,
  [
    body('firstName').optional().trim().notEmpty(),
    body('lastName').optional().trim().notEmpty(),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw createError('Invalid input', 400);

      const { firstName, lastName } = req.body;

      const user = await prisma.user.update({
        where: { id: req.userId! },
        data: { ...(firstName && { firstName }), ...(lastName && { lastName }) },
        select: { id: true, email: true, firstName: true, lastName: true, role: true },
      });

      res.json({ user });
    } catch (err) {
      next(err);
    }
  },
);

/**
 * @openapi
 * /api/v1/users/me/password:
 *   patch:
 *     summary: Change password
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 */
usersRouter.patch(
  '/me/password',
  authenticate,
  [
    body('currentPassword').notEmpty(),
    body('newPassword').isLength({ min: 8 }),
  ],
  async (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) throw createError('Invalid input', 400);

      const { currentPassword, newPassword } = req.body;

      const user = await prisma.user.findUnique({ where: { id: req.userId! } });
      if (!user) throw createError('User not found', 404);

      const valid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!valid) throw createError('Current password is incorrect', 400);

      const passwordHash = await bcrypt.hash(newPassword, 12);
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

      res.json({ message: 'Password updated successfully' });
    } catch (err) {
      next(err);
    }
  },
);
