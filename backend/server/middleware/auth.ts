import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma.js';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    role: 'admin' | 'guard' | 'host' | 'warden' | 'visitor' | 'student';
    email: string;
    roll_number?: string | null;
  };
}

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_development_only';

export const requireAuth = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else if (typeof req.query.token === 'string') {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ error: 'UNAUTHORIZED: Missing Bearer token' });
    }

    let payload: jwt.JwtPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    } catch {
      return res.status(401).json({ error: 'UNAUTHORIZED: Invalid or expired token' });
    }

    const host = await prisma.host.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true, role: true, email: true, roll_number: true },
    });

    if (!host) {
      return res.status(401).json({ error: 'UNAUTHORIZED: User profile not found' });
    }

    req.user = {
      id: host.id,
      name: host.name,
      role: host.role as 'admin' | 'guard' | 'host' | 'visitor' | 'student',
      email: host.email,
      roll_number: host.roll_number,
    };

    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    res.status(500).json({ error: 'Internal server error during authentication' });
  }
};

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET) as jwt.JwtPayload;
    const host = await prisma.host.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, name: true, role: true, email: true, roll_number: true },
    });

    if (host) {
      req.user = {
        id: host.id,
        name: host.name,
        role: host.role as 'admin' | 'guard' | 'host' | 'visitor' | 'student',
        email: host.email,
        roll_number: host.roll_number,
      };
    }
  } catch {
  }
  next();
};
