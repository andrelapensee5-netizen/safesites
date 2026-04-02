import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '../models/prisma';
import { authenticate, AuthRequest } from '../middleware/auth';
import { stripeService } from '../services/stripe';
import { createError } from '../middleware/errorHandler';

export const subscriptionRouter = Router();

/**
 * @openapi
 * /api/v1/subscriptions/status:
 *   get:
 *     summary: Get current subscription status
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
subscriptionRouter.get('/status', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw createError('User not found', 404);

    const isTrialing = user.subscriptionStatus === 'TRIALING' &&
      user.trialEndsAt && user.trialEndsAt > new Date();

    res.json({
      status: user.subscriptionStatus,
      isTrialing,
      trialEndsAt: user.trialEndsAt,
      documentsThisMonth: user.documentsThisMonth,
      documentsLimit: user.documentsThisMonth > 15 ? 'unlimited (2x price)' : 15,
    });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/subscriptions/checkout:
 *   post:
 *     summary: Create Stripe checkout session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
subscriptionRouter.post('/checkout', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user) throw createError('User not found', 404);

    const session = await stripeService.createCheckoutSession(
      user.id,
      user.email,
      user.stripeCustomerId || undefined,
    );

    res.json({ checkoutUrl: session.url, sessionId: session.id });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/subscriptions/portal:
 *   post:
 *     summary: Create Stripe customer portal session
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
subscriptionRouter.post('/portal', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } });
    if (!user?.stripeCustomerId) throw createError('No active subscription', 400);

    const session = await stripeService.createPortalSession(user.stripeCustomerId);

    res.json({ portalUrl: session.url });
  } catch (err) {
    next(err);
  }
});

/**
 * @openapi
 * /api/v1/subscriptions/invoices:
 *   get:
 *     summary: Get payment history
 *     tags: [Subscriptions]
 *     security:
 *       - bearerAuth: []
 */
subscriptionRouter.get('/invoices', authenticate, async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.userId! },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    res.json({ payments });
  } catch (err) {
    next(err);
  }
});
