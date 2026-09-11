import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { status, category, search } = req.query;

    const where: any = {};
    if (status && typeof status === 'string' && status !== 'all') {
      where.status = status;
    }
    if (category && typeof category === 'string' && category !== 'all') {
      where.category = category;
    }
    if (search && typeof search === 'string' && search.trim()) {
      const q = search.trim();
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { location_found: { contains: q, mode: 'insensitive' } },
        { found_by_name: { contains: q, mode: 'insensitive' } },
        { claimed_by_name: { contains: q, mode: 'insensitive' } },
        { claimed_by_id: { contains: q, mode: 'insensitive' } },
      ];
    }

    const items = await prisma.lostAndFoundItem.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    const totalCount = await prisma.lostAndFoundItem.count();
    const inCustodyCount = await prisma.lostAndFoundItem.count({
      where: { status: 'in_custody' },
    });
    const claimedCount = await prisma.lostAndFoundItem.count({
      where: { status: 'claimed' },
    });

    res.json({
      items,
      stats: {
        total: totalCount,
        inCustody: inCustodyCount,
        claimed: claimedCount,
      },
    });
  } catch (err: any) {
    console.error('Error fetching lost & found items:', err);
    res.status(500).json({ error: 'Failed to retrieve lost & found items.' });
  }
});

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      title,
      category,
      description,
      location_found,
      photo_url,
      found_by_name,
      found_by_role = 'guard',
      found_by_contact,
    } = req.body;

    if (!title || !category || !location_found || !found_by_name) {
      return res.status(400).json({
        error: 'Title, Category, Location Found, and Finder Name are required.',
      });
    }

    const item = await prisma.lostAndFoundItem.create({
      data: {
        title: title.trim(),
        category,
        description: description?.trim() || null,
        location_found: location_found.trim(),
        photo_url: photo_url || null,
        found_by_name: found_by_name.trim(),
        found_by_role,
        found_by_contact: found_by_contact?.trim() || null,
        status: 'in_custody',
      },
    });

    res.status(201).json({ item, message: 'Item logged successfully.' });
  } catch (err: any) {
    console.error('Error logging lost item:', err);
    res.status(500).json({ error: 'Failed to log lost item.' });
  }
});

router.patch('/:id/claim', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const {
      claimed_by_name,
      claimed_by_id,
      claimed_by_phone,
      handover_officer,
    } = req.body;

    if (!claimed_by_name || !claimed_by_id) {
      return res.status(400).json({
        error: 'Claimant Name and Identification Number (Roll No / ID) are required for handover.',
      });
    }

    const existing = await prisma.lostAndFoundItem.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Item not found.' });
    }

    const officer = handover_officer || req.user?.name || 'Duty Security Officer';

    const updated = await prisma.lostAndFoundItem.update({
      where: { id },
      data: {
        status: 'claimed',
        claimed_by_name: claimed_by_name.trim(),
        claimed_by_id: claimed_by_id.trim().toUpperCase(),
        claimed_by_phone: claimed_by_phone?.trim() || null,
        claimed_at: new Date(),
        handover_officer: officer,
      },
    });

    res.json({ item: updated, message: 'Item successfully marked as handed over and claimed.' });
  } catch (err: any) {
    console.error('Error claiming lost item:', err);
    res.status(500).json({ error: 'Failed to process item claim.' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    await prisma.lostAndFoundItem.delete({
      where: { id },
    });
    res.json({ success: true, message: 'Item removed from registry.' });
  } catch (err: any) {
    console.error('Error deleting lost item:', err);
    res.status(500).json({ error: 'Failed to delete item.' });
  }
});

export default router;
