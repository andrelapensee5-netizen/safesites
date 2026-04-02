import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../models/prisma';
import { createError } from './errorHandler';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export const authenticate = async (
  req: AuthRequest,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      throw createError('No token provided', 401);
    }

    const token = authHeader.substring(7);
    const secret = process.env.JWT_SECRET;
    if (!secret) throw createError('Server configuration error', 500);

    const decoded = jwt.verify(token, secret) as { userId: string; role: string };

    const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
    if (!user) throw createError('User not found', 401);
    if (!user.emailVerified) throw createError('Email not verified', 403);

    req.userId = user.id;
    req.userRole = user.role;
    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (...roles: string[]) =>
  (req: AuthRequest, _res: Response, next: NextFunction): void => {
    if (!req.userRole || !roles.includes(req.userRole)) {
      next(createError('Forbidden', 403));
      return;
    }
    next();
  };
