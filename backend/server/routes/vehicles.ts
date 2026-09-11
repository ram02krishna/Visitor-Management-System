import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const {
      owner_type = 'student',
      owner_name,
      roll_number,
      vehicle_type = 'two_wheeler',
      license_plate,
      vehicle_model,
      parking_slot,
    } = req.body;

    if (!license_plate || !license_plate.trim()) {
      return res.status(400).json({ error: 'License Plate / Vehicle Number is required.' });
    }

    const cleanPlate = license_plate.trim().toUpperCase();

    const existing = await prisma.vehiclePass.findUnique({
      where: { license_plate: cleanPlate },
    });

    if (existing) {
      return res.status(409).json({ error: `Vehicle with License Plate "${cleanPlate}" is already registered.` });
    }

    const vehiclePass = await prisma.vehiclePass.create({
      data: {
        owner_type,
        owner_name: owner_name || req.user?.name || 'Campus Resident',
        roll_number: roll_number ? roll_number.trim().toUpperCase() : req.user?.roll_number,
        vehicle_type,
        license_plate: cleanPlate,
        vehicle_model: vehicle_model || null,
        parking_slot: parking_slot || null,
        status: 'active',
      },
    });

    res.status(201).json({
      success: true,
      message: `Vehicle Pass issued for ${cleanPlate}.`,
      vehiclePass,
    });
  } catch (err) {
    console.error('[API POST /vehicles]', err);
    res.status(500).json({ error: 'Failed to register vehicle pass' });
  }
});

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { search, owner_type, status } = req.query;

    const passes = await prisma.vehiclePass.findMany({
      where: {
        ...(status ? { status: String(status) } : {}),
        ...(owner_type ? { owner_type: String(owner_type) } : {}),
        ...(search
          ? {
              OR: [
                { license_plate: { contains: String(search), mode: 'insensitive' } },
                { roll_number: { contains: String(search), mode: 'insensitive' } },
                { owner_name: { contains: String(search), mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { created_at: 'desc' },
      take: 100,
    });

    res.json(passes);
  } catch (err) {
    console.error('[API GET /vehicles]', err);
    res.status(500).json({ error: 'Failed to list vehicle passes' });
  }
});

router.get('/lookup/:plate', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { plate } = req.params;
    const cleanPlate = String(plate).trim().toUpperCase();

    const pass = await prisma.vehiclePass.findUnique({
      where: { license_plate: cleanPlate },
    });

    if (!pass) {
      return res.status(404).json({ error: `Vehicle "${cleanPlate}" has no registered gate pass.` });
    }

    res.json({ success: true, pass });
  } catch (err) {
    console.error('[API GET /vehicles/lookup/:plate]', err);
    res.status(500).json({ error: 'Failed to lookup vehicle' });
  }
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;

    await prisma.vehiclePass.delete({
      where: { id: String(id) },
    });

    res.json({ success: true, message: 'Vehicle Pass revoked successfully.' });
  } catch (err) {
    console.error('[API DELETE /vehicles/:id]', err);
    res.status(500).json({ error: 'Failed to revoke vehicle pass' });
  }
});

export default router;
