import { prisma } from '../models/prisma';
import { createError } from '../middleware/errorHandler';

const BASE_MONTHLY_PRICE_CENTS = 4900; // $49

export const subscriptionService = {
  async checkDocumentLimit(userId: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw createError('User not found', 404);

    const isTrial = user.subscriptionStatus === 'TRIALING' &&
      user.trialEndsAt && user.trialEndsAt > new Date();

    const isActive = user.subscriptionStatus === 'ACTIVE';

    if (!isTrial && !isActive) {
      throw createError('Active subscription required to upload documents', 403);
    }

    // Trials are limited to 3 documents
    if (isTrial && user.documentsThisMonth >= 3) {
      throw createError('Trial document limit reached. Please subscribe to continue.', 403);
    }
  },

  async incrementDocumentCount(userId: string): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: { documentsThisMonth: { increment: 1 } },
    });
  },

  /**
   * Calculate the effective price for the next document.
   * Base: $49/month for up to 15 documents.
   * After 15 docs in a billing cycle: doubled rate per document.
   */
  getEffectivePrice(documentsThisMonth: number): number {
    if (documentsThisMonth <= 15) return 0; // Included in subscription
    const extraDocs = documentsThisMonth - 15;
    const perDocRate = BASE_MONTHLY_PRICE_CENTS / 15; // ~$3.27 per doc
    return Math.round(perDocRate * 2 * extraDocs); // 2x rate
  },
};
