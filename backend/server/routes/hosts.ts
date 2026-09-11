import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const search = req.query.search as string | undefined;

    const hosts = await prisma.host.findMany({
      where: search
        ? {
            OR: [
              { name: { contains: search, mode: 'insensitive' } },
              { email: { contains: search, mode: 'insensitive' } },
            ],
          }
        : undefined,
      include: { department: { select: { name: true } } },
      orderBy: { created_at: 'desc' },
    });

    res.status(200).json(hosts);
  } catch (err: unknown) {
    console.error('[API GET /hosts]', err);
    res.status(500).json({
      error: 'Failed to fetch hosts',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const host = await prisma.host.findUnique({
      where: { id },
      include: { department: { select: { name: true } } },
    });

    if (!host) {
      return res.status(404).json({ error: 'Host not found' });
    }

    res.status(200).json(host);
  } catch (err: unknown) {
    res.status(500).json({
      error: 'Failed to fetch host',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    if (authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const id = req.params.id as string;
    const { role, active, name, department_id } = req.body;

    const updated = await prisma.host.update({
      where: { id },
      data: {
        ...(role !== undefined && { role }),
        ...(active !== undefined && { active }),
        ...(name !== undefined && { name }),
        ...(department_id !== undefined && { department_id }),
      },
    });

    res.status(200).json(updated);
  } catch (err: unknown) {
    console.error('[API PATCH /hosts/:id]', err);
    res.status(500).json({
      error: 'Failed to update host',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    if (authUser.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden: admin only' });
    }

    const id = req.params.id as string;
    await prisma.host.delete({ where: { id } });

    res.status(200).json({ success: true });
  } catch (err: unknown) {
    console.error('[API DELETE /hosts/:id]', err);
    res.status(500).json({
      error: 'Failed to delete host',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

export default router;
