import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user;
    const { search, blacklisted, email, ids } = req.query as Record<string, string>;

    type WhereClause = {
      is_blacklisted?: boolean;
      email?: { equals: string; mode: 'insensitive' } | { in: string[] };
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        email?: { contains: string; mode: 'insensitive' };
      }>;
    };

    const where: WhereClause = {};

    if (!authUser) {
      if (!email) {
        return res.status(403).json({ error: 'Forbidden: Must provide email for public query' });
      }
      where.email = { equals: email.trim(), mode: 'insensitive' };
    } else {
      if (blacklisted === 'true') where.is_blacklisted = true;

      if (email) {
        where.email = { equals: email.trim(), mode: 'insensitive' };
      }

      if (ids) {
        const idArray = ids.split(',').filter(Boolean);
        where.email = { in: idArray };
      }

      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }
      if (authUser.role === 'visitor') {
        where.email = { equals: authUser.email, mode: 'insensitive' };
      }
    }

    const visitors = await prisma.visitor.findMany({
      where,
      orderBy: { updated_at: 'desc' },
    });

    res.status(200).json(visitors);
  } catch (err: unknown) {
    console.error('[API GET /visitors]', err);
    res.status(500).json({
      error: 'Failed to fetch visitors',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const { name, email, phone, photo_url, id_proof_url } = req.body;

    if (!name || !email || !phone) {
      return res.status(400).json({ error: 'name, email, and phone are required' });
    }

    const existing = await prisma.visitor.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, is_blacklisted: true, blacklist_reason: true },
    });

    if (existing?.is_blacklisted) {
      return res.status(403).json({
        error: `Visitor is blacklisted: ${existing.blacklist_reason ?? 'No reason given'}`,
      });
    }

    const visitor = existing
      ? await prisma.visitor.update({
          where: { id: existing.id },
          data: {
            name,
            phone,
            ...(photo_url && { photo_url }),
            ...(id_proof_url && { id_proof_url }),
          },
        })
      : await prisma.visitor.create({
          data: { name, email: email.trim().toLowerCase(), phone, photo_url, id_proof_url },
        });

    res.status(existing ? 200 : 201).json(visitor);
  } catch (err) {
    console.error('[API POST /visitors]', err);
    res.status(500).json({
      error: 'Failed to upsert visitor',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    if (authUser.role !== 'admin' && authUser.role !== 'guard') {
      return res.status(403).json({ error: 'Forbidden: admin or guard only' });
    }

    const id = req.params.id as string;
    const { is_blacklisted, blacklist_reason } = req.body;

    const updated = await prisma.visitor.update({
      where: { id },
      data: {
        ...(is_blacklisted !== undefined && { is_blacklisted }),
        ...(blacklist_reason !== undefined && { blacklist_reason }),
      },
    });

    res.status(200).json(updated);
  } catch (err: unknown) {
    console.error('[API PATCH /visitors/:id]', err);
    res.status(500).json({
      error: 'Failed to update visitor',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
