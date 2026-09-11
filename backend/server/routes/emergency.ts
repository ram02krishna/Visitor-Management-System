import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, AuthRequest } from '../middleware/auth.js';

const router = Router();

router.get('/active', requireAuth, async (_req: AuthRequest, res) => {
  try {
    const alert = await prisma.emergencyAlert.findFirst({
      where: { active: true },
      orderBy: { created_at: 'desc' },
      include: {
        checkins: {
          orderBy: { checked_in_at: 'desc' },
        },
      },
    });

    res.json(alert || null);
  } catch (err) {
    console.error('[API GET /emergency/active]', err);
    res.status(500).json({ error: 'Failed to fetch active emergency status' });
  }
});

router.post('/alert', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'guard' && req.user?.role !== 'host') {
      return res.status(403).json({ error: 'Unauthorized to issue campus-wide emergency broadcasts.' });
    }

    const { title, message, severity = 'critical' } = req.body;
    if (!title || !message) {
      return res.status(400).json({ error: 'Title and emergency instructions message are required.' });
    }

    await prisma.emergencyAlert.updateMany({
      where: { active: true },
      data: { active: false, resolved_at: new Date() },
    });

    const alert = await prisma.emergencyAlert.create({
      data: {
        title,
        message,
        severity,
        active: true,
        created_by: req.user?.name || 'Campus Emergency Command',
      },
    });

    res.status(201).json({
      success: true,
      message: `🚨 Emergency Alert "${title}" broadcasted campus-wide!`,
      alert,
    });
  } catch (err) {
    console.error('[API POST /emergency/alert]', err);
    res.status(500).json({ error: 'Failed to broadcast emergency alert' });
  }
});

router.post('/resolve', requireAuth, async (req: AuthRequest, res) => {
  try {
    if (req.user?.role !== 'admin' && req.user?.role !== 'guard' && req.user?.role !== 'host') {
      return res.status(403).json({ error: 'Unauthorized to resolve emergency alerts.' });
    }

    await prisma.emergencyAlert.updateMany({
      where: { active: true },
      data: { active: false, resolved_at: new Date() },
    });

    res.json({ success: true, message: 'Campus Emergency Alert resolved. Normal operations resumed.' });
  } catch (err) {
    console.error('[API POST /emergency/resolve]', err);
    res.status(500).json({ error: 'Failed to resolve emergency alert' });
  }
});

router.post('/checkin', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { alert_id, status = 'safe', location, notes, roll_number, name } = req.body;

    if (!alert_id) {
      return res.status(400).json({ error: 'Alert ID is required.' });
    }

    const studentRoll = (roll_number || req.user?.roll_number || '').trim().toUpperCase();
    const studentName = name || req.user?.name || 'Resident Student';

    const checkin = await prisma.emergencyCheckIn.create({
      data: {
        alert_id,
        roll_number: studentRoll,
        name: studentName,
        status,
        location: location || 'Hostel Block A',
        notes: notes || null,
      },
    });

    res.status(201).json({
      success: true,
      message: status === 'need_help' ? '🚨 Assistance request dispatched to Security!' : '✅ Marked Safe on Campus Census.',
      checkin,
    });
  } catch (err) {
    console.error('[API POST /emergency/checkin]', err);
    res.status(500).json({ error: 'Failed to process emergency check-in' });
  }
});

router.get('/census/:alertId', requireAuth, async (req: AuthRequest, res) => {
  try {
    const { alertId } = req.params;

    const [totalStudents, checkins] = await Promise.all([
      prisma.student.count(),
      prisma.emergencyCheckIn.findMany({
        where: { alert_id: String(alertId) },
      }),
    ]);

    const safeCount = checkins.filter((c) => c.status === 'safe').length;
    const needHelpCount = checkins.filter((c) => c.status === 'need_help').length;
    const pendingCount = Math.max(0, totalStudents - checkins.length);

    res.json({
      totalStudents,
      safeCount,
      needHelpCount,
      pendingCount,
      checkins,
    });
  } catch (err) {
    console.error('[API GET /emergency/census]', err);
    res.status(500).json({ error: 'Failed to fetch emergency census' });
  }
});

export default router;
