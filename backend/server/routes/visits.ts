import { Router } from 'express';
import { prisma } from '../lib/prisma.js';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth.js';
import {
  sendVisitRequestReceivedEmail,
  sendVisitApprovedEmail,
  sendVisitDeniedEmail,
  sendVisitCheckInEmail,
  sendVisitCheckOutEmail,
  VisitEmailData,
} from '../lib/email.js';
import { invalidateStudentCaches } from './students.js';

const router = Router();

router.get('/public', async (_req, res) => {
  try {
    const visits = await prisma.visit.findMany({
      where: {
        status: 'approved',
        valid_until: {
          gte: new Date(),
        },
      },
      include: {
        visitor: true,
        host: true,
      },
      orderBy: { created_at: 'desc' },
    });

    const formatted = visits.map((v: any) => ({
      ...v,
      visitors: v.visitor,
      hosts: v.host,
    }));

    res.json(formatted);
  } catch (err) {
    console.error('[API GET /visits/public]', err);
    res.status(500).json({
      error: 'Failed to fetch public visits',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

function formatMovementAsVisit(m: any) {
  const isCompleted = !!m.entry_time;
  const isDayOuting = m.movement_type === 'day_outing';
  return {
    id: `mov-${m.id}`,
    visitor_id: m.student_id,
    host_id: null,
    purpose: `[GATE TELEMETRY] ${isDayOuting ? 'Day Outing' : 'Hostel Leave'}${m.purpose ? ` — ${m.purpose}` : ''}`,
    status: isCompleted ? 'completed' : 'checked_in',
    approved_at: m.created_at,
    approved_by: null,
    check_in_time: m.entry_time,
    check_out_time: m.exit_time,
    valid_from: m.exit_time,
    valid_until: m.expected_in,
    expected_out_time: m.expected_in,
    vehicle_number: null,
    vehicle_type: null,
    entry_gate: m.entry_gate || (isCompleted ? 'Main Gate' : null),
    exit_gate: m.exit_gate || 'Main Gate',
    additional_guests: 0,
    pass_type: isDayOuting ? 'single_day' : 'multi_day',
    is_vip: false,
    vip_category: null,
    vip_parking_slot: null,
    overstay_notified: m.is_overdue || false,
    escort_name: null,
    created_at: m.exit_time || m.created_at,
    updated_at: m.updated_at,
    visitor: {
      id: m.student_id,
      name: m.student?.name || 'Student',
      email: m.student?.email || '',
      phone: m.student?.phone || '-',
      photo_url: m.student?.photo_url || null,
      id_proof_url: null,
      is_blacklisted: false,
      blacklist_reason: null,
      created_at: m.student?.created_at || m.created_at,
      updated_at: m.student?.updated_at || m.updated_at,
    },
    host: {
      id: 'gate-security',
      name: 'Gate Telemetry',
      email: 'guard@iiitn.ac.in',
      department_id: null,
    },
  };
}

router.get('/', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const {
      status,
      statuses,
      search,
      date,
      limit,
      offset,
      host_id: qHostId,
      approved_from,
      approved_to,
      checkout_from,
      checkout_to,
      created_from,
      created_to,
    } = req.query as Record<string, string>;

    const andConditions: any[] = [];

    if (authUser.role === 'admin' || authUser.role === 'warden' || authUser.role === 'guard') {
    } else if (authUser.role === 'host') {
      andConditions.push({
        OR: [
          { host_id: authUser.id },
          { approved_by: authUser.id },
          { host: { email: { equals: authUser.email, mode: 'insensitive' } } },
          { visitor: { email: { equals: authUser.email, mode: 'insensitive' } } },
        ],
      });
    } else if (authUser.role === 'visitor' || authUser.role === 'student') {
      andConditions.push({
        visitor: {
          email: { equals: authUser.email, mode: 'insensitive' },
          ...(authUser.name ? { name: { equals: authUser.name, mode: 'insensitive' } } : {}),
        },
      });
    }

    if (status) andConditions.push({ status });
    if (statuses) {
      const statusArray = statuses.split(',').filter(Boolean);
      andConditions.push({ status: { in: statusArray } });
    }
    if (qHostId) andConditions.push({ host_id: qHostId });

    if (approved_from || approved_to) {
      andConditions.push({
        approved_at: {
          ...(approved_from ? { gte: new Date(approved_from) } : {}),
          ...(approved_to ? { lt: new Date(approved_to) } : {}),
        },
      });
    }
    if (checkout_from || checkout_to) {
      andConditions.push({
        check_out_time: {
          ...(checkout_from ? { gte: new Date(checkout_from) } : {}),
          ...(checkout_to ? { lt: new Date(checkout_to) } : {}),
        },
      });
    }
    if (created_from || created_to) {
      andConditions.push({
        created_at: {
          ...(created_from ? { gte: new Date(created_from) } : {}),
          ...(created_to ? { lte: new Date(created_to) } : {}),
        },
      });
    }
    if (date) {
      const start = new Date(date);
      start.setHours(0, 0, 0, 0);
      const end = new Date(date);
      end.setHours(23, 59, 59, 999);
      andConditions.push({ created_at: { gte: start, lte: end } });
    }
    if (search) {
      andConditions.push({
        OR: [
          { purpose: { contains: search, mode: 'insensitive' } },
          { visitor: { name: { contains: search, mode: 'insensitive' } } },
          { visitor: { email: { contains: search, mode: 'insensitive' } } },
          { vehicle_number: { contains: search, mode: 'insensitive' } },
        ],
      });
    }

    const where = andConditions.length > 0 ? { AND: andConditions } : {};
    const take = limit ? Math.min(Number(limit), 200) : 50;
    const skip = offset ? Number(offset) : 0;

    const visits = await prisma.visit.findMany({
      where,
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true, department_id: true } },
      },
      orderBy: { created_at: 'desc' },
      take: (authUser.role === 'guard' || authUser.role === 'student') ? 200 : take,
      skip: (authUser.role === 'guard' || authUser.role === 'student') ? 0 : skip,
    });

    if (authUser.role === 'guard' || authUser.role === 'student') {
      const movConditions: any[] = [];

      if (authUser.role === 'student') {
        movConditions.push({
          OR: [
            { student: { email: { equals: authUser.email, mode: 'insensitive' } } },
            ...(authUser.roll_number ? [{ student: { roll_number: { equals: authUser.roll_number, mode: 'insensitive' } } }] : []),
          ],
        });
      }

      if (status) {
        if (status === 'checked_in') {
          movConditions.push({ entry_time: null });
        } else if (status === 'completed') {
          movConditions.push({ entry_time: { not: null } });
        } else {
          movConditions.push({ id: '00000000-0000-0000-0000-000000000000' });
        }
      }

      if (created_from || created_to) {
        movConditions.push({
          exit_time: {
            ...(created_from ? { gte: new Date(created_from) } : {}),
            ...(created_to ? { lte: new Date(created_to) } : {}),
          },
        });
      }

      if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        movConditions.push({ exit_time: { gte: start, lte: end } });
      }

      if (search) {
        movConditions.push({
          OR: [
            { purpose: { contains: search, mode: 'insensitive' } },
            { student: { name: { contains: search, mode: 'insensitive' } } },
            { student: { email: { contains: search, mode: 'insensitive' } } },
            { student: { roll_number: { contains: search, mode: 'insensitive' } } },
          ],
        });
      }

      const movWhere = movConditions.length > 0 ? { AND: movConditions } : {};
      const movements = await prisma.studentMovement.findMany({
        where: movWhere,
        include: { student: true },
        orderBy: { exit_time: 'desc' },
        take: 200,
      });

      const formattedMovements = movements.map(formatMovementAsVisit);
      const combined = [...visits, ...formattedMovements].sort((a, b) => {
        const timeA = new Date(a.created_at || a.check_in_time || 0).getTime();
        const timeB = new Date(b.created_at || b.check_in_time || 0).getTime();
        return timeB - timeA;
      });

      const paged = combined.slice(skip, skip + take);
      return res.status(200).json(paged);
    }

    res.status(200).json(visits);
  } catch (err: unknown) {
    console.error('[API GET /visits]', err);
    res.status(500).json({
      error: 'Failed to fetch visits',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/', optionalAuth, async (req: AuthRequest, res) => {
  try {
    const body = req.body;

    const visit = await prisma.visit.create({
      data: {
        ...(body.id ? { id: body.id } : {}),
        visitor_id: body.visitor_id,
        host_id: body.host_id ?? null,
        purpose: body.purpose,
        status: (body.status as 'pending' | 'approved') ?? 'pending',
        approved_at: body.approved_at ? new Date(body.approved_at) : (body.status === 'approved' ? new Date() : null),
        approved_by: body.approved_by ?? (body.status === 'approved' && req.user?.id ? req.user.id : null),
        valid_until: body.valid_until ? new Date(body.valid_until) : null,
        valid_from: body.valid_from ? new Date(body.valid_from) : new Date(),
        expected_out_time: body.expected_out_time ? new Date(body.expected_out_time) : null,
        vehicle_number: body.vehicle_number ?? null,
        vehicle_type: body.vehicle_type ?? null,
        additional_guests: body.additional_guests ?? 0,
        pass_type: (body.pass_type as 'single_day' | 'multi_day') ?? 'single_day',
      },
      include: { visitor: true, host: true },
    });

    if (visit.visitor) {
      const emailData: VisitEmailData = {
        visitorName: visit.visitor.name,
        visitorEmail: visit.visitor.email,
        visitId: visit.id,
        purpose: visit.purpose,
        passType: visit.pass_type,
        validFrom: visit.valid_from ? visit.valid_from.toISOString().split('T')[0] : '',
        validUntil: visit.valid_until ? visit.valid_until.toISOString().split('T')[0] : '',
        vehicleNumber: visit.vehicle_number || 'None',
        hostName: visit.host?.name || 'Campus Administration',
        approvedBy: visit.status === 'approved' ? (visit.host?.name || (req.user as any)?.name || 'Campus Authority') : undefined,
      };

      if (visit.status === 'approved') {
        sendVisitApprovedEmail(emailData).catch((err) => console.error('[Email error]:', err));
      } else {
        sendVisitRequestReceivedEmail(emailData).catch((err) => console.error('[Email error]:', err));
      }
    }

    res.status(201).json(visit);
  } catch (err) {
    console.error('[API POST /visits]', err);
    res.status(500).json({
      error: 'Failed to create visit',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.post('/bulk', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const { approverEmail, visitors } = req.body;

    if (!['admin', 'guard', 'host', 'warden'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const approver = await prisma.host.findUnique({
      where: { email: approverEmail.trim().toLowerCase() },
      select: { id: true, name: true },
    });

    if (!approver) {
      return res.status(404).json({ error: `No faculty/staff/admin found with email: ${approverEmail}` });
    }

    let createdCount = 0;
    for (const vData of visitors) {
      const email = vData.email.trim().toLowerCase();

      let visitor = await prisma.visitor.findFirst({
        where: { email },
      });

      if (!visitor) {
        visitor = await prisma.visitor.create({
          data: {
            name: vData.name,
            email,
            phone: vData.phone || 'N/A',
          },
        });
      }

      const newVisit = await prisma.visit.create({
        data: {
          visitor_id: visitor.id,
          host_id: approver.id,
          purpose: vData.purpose || 'N/A',
          status: 'approved',
          approved_at: new Date(),
          approved_by: authUser.id,
          valid_from: vData.valid_from ? new Date(vData.valid_from) : new Date(),
          valid_until: vData.valid_until ? new Date(vData.valid_until) : null,
          additional_guests: vData.additional_guests || 0,
          vehicle_number: vData.vehicle_number || null,
          vehicle_type: vData.vehicle_type || null,
          pass_type: vData.pass_type || 'single_day',
        },
      });

      sendVisitApprovedEmail({
        visitorName: visitor.name,
        visitorEmail: visitor.email,
        visitId: newVisit.id,
        purpose: newVisit.purpose,
        passType: newVisit.pass_type,
        validFrom: newVisit.valid_from ? newVisit.valid_from.toISOString().split('T')[0] : '',
        validUntil: newVisit.valid_until ? newVisit.valid_until.toISOString().split('T')[0] : '',
        vehicleNumber: newVisit.vehicle_number || 'None',
        hostName: approver.name || 'Campus Administration',
        approvedBy: authUser.name || 'Campus Authority',
      }).catch((err) => console.error('Bulk email error:', err));

      createdCount++;
    }

    res.status(201).json({ success: true, count: createdCount });
  } catch (err) {
    console.error('[API POST /visits/bulk]', err);
    res.status(500).json({
      error: 'Failed to process bulk upload',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const id = req.params.id as string;

    if (id.startsWith('mov-')) {
      const movementId = id.replace('mov-', '');
      const movement = await prisma.studentMovement.findUnique({
        where: { id: movementId },
        include: { student: true },
      });
      if (!movement) {
        return res.status(404).json({ error: 'Movement log not found' });
      }
      if (authUser.role === 'student' && movement.student?.email?.toLowerCase() !== authUser.email.toLowerCase()) {
        return res.status(403).json({ error: 'Forbidden' });
      }
      const formatted = formatMovementAsVisit(movement);
      return res.status(200).json({ ...formatted, visitors: formatted.visitor, hosts: formatted.host });
    }

    const visit = await prisma.visit.findUnique({
      where: { id },
      include: {
        visitor: true,
        host: { select: { id: true, name: true, email: true, department_id: true } },
      },
    });

    if (!visit) {
      return res.status(404).json({ error: 'Visit not found' });
    }

    if (authUser.role === 'visitor' || authUser.role === 'student') {
      if (visit.visitor?.email?.toLowerCase() !== authUser.email.toLowerCase() && visit.host_id !== authUser.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    } else if (authUser.role === 'host') {
      if (
        visit.host_id !== authUser.id &&
        visit.approved_by !== authUser.id &&
        visit.host?.email?.toLowerCase() !== authUser.email.toLowerCase() &&
        visit.visitor?.email?.toLowerCase() !== authUser.email.toLowerCase()
      ) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    res.status(200).json({ ...visit, visitors: visit.visitor, hosts: visit.host });
  } catch (err: unknown) {
    console.error('[API GET /visits/:id]', err);
    res.status(500).json({
      error: 'Failed to fetch visit',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.patch('/:id', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    const id = req.params.id as string;
    const body = req.body;

    const allowedRoles = ['admin', 'guard', 'warden', 'host'];

    if (id.startsWith('mov-')) {
      const movementId = id.replace('mov-', '');
      const movement = await prisma.studentMovement.findUnique({
        where: { id: movementId },
        include: { student: true },
      });
      if (!movement) {
        return res.status(404).json({ error: 'Movement log not found' });
      }
      if (!allowedRoles.includes(authUser.role)) {
        return res.status(403).json({ error: 'Forbidden' });
      }

      const entryTime = body.check_in_time ? new Date(body.check_in_time) : new Date();
      const entryGate = body.entry_gate || body.exit_gate || 'Main Gate';

      const [updatedMov] = await prisma.$transaction([
        prisma.studentMovement.update({
          where: { id: movementId },
          data: {
            entry_time: entryTime,
            entry_gate: entryGate,
          },
          include: { student: true },
        }),
        prisma.student.update({
          where: { id: movement.student_id },
          data: { status: 'inside' },
        }),
      ]);

      invalidateStudentCaches();

      const formatted = formatMovementAsVisit(updatedMov);
      return res.status(200).json({ ...formatted, visitors: formatted.visitor, hosts: formatted.host });
    }

    const oldVisit = await prisma.visit.findUnique({
      where: { id },
      select: { host_id: true, status: true, check_in_time: true, check_out_time: true },
    });

    if (!allowedRoles.includes(authUser.role)) {
      if (oldVisit?.host_id !== authUser.id) {
        return res.status(403).json({ error: 'Forbidden' });
      }
    }

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.approved_at !== undefined && { approved_at: body.approved_at ? new Date(body.approved_at) : null }),
        ...(body.approved_by !== undefined && { approved_by: body.approved_by }),
        ...(body.check_in_time !== undefined && { check_in_time: body.check_in_time ? new Date(body.check_in_time) : null }),
        ...(body.check_out_time !== undefined && { check_out_time: body.check_out_time ? new Date(body.check_out_time) : null }),
        ...(body.exit_gate !== undefined && { exit_gate: body.exit_gate }),
        ...(body.entry_gate !== undefined && { entry_gate: body.entry_gate }),
      },
      include: {
        visitor: true,
        host: true,
      },
    });

    if (updated.visitor) {
      const emailData: VisitEmailData = {
        visitorName: updated.visitor.name,
        visitorEmail: updated.visitor.email,
        visitId: updated.id,
        purpose: updated.purpose,
        passType: updated.pass_type,
        validFrom: updated.valid_from ? updated.valid_from.toISOString().split('T')[0] : '',
        validUntil: updated.valid_until ? updated.valid_until.toISOString().split('T')[0] : '',
        vehicleNumber: updated.vehicle_number || 'None',
        hostName: updated.host?.name || 'Campus Administration',
      };

      if (body.status && oldVisit && oldVisit.status !== body.status) {
        if (body.status === 'approved') {
          emailData.approvedBy = (authUser as any).name || authUser.email || 'Campus Administration';
          sendVisitApprovedEmail(emailData).catch((err) => console.error('Email error:', err));
        } else if (body.status === 'denied' || body.status === 'cancelled') {
          emailData.deniedBy = (authUser as any).name || authUser.email || 'Campus Administration';
          sendVisitDeniedEmail(emailData).catch((err) => console.error('Email error:', err));
        }
      }

      if (body.check_in_time && !oldVisit?.check_in_time) {
        sendVisitCheckInEmail({
          ...emailData,
          checkInTime: new Date(body.check_in_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
          entryGate: updated.entry_gate || 'Main Gate',
        }).catch((err) => console.error('CheckIn email error:', err));
      }

      if (body.check_out_time && !oldVisit?.check_out_time) {
        sendVisitCheckOutEmail({
          ...emailData,
          checkOutTime: new Date(body.check_out_time).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' }),
          exitGate: updated.exit_gate || 'Main Gate',
        }).catch((err) => console.error('CheckOut email error:', err));
      }
    }

    res.status(200).json({
      ...updated,
      visitors: (updated as unknown as Record<string, unknown>).visitor,
      hosts: (updated as unknown as Record<string, unknown>).host,
    });
  } catch (err: unknown) {
    console.error('[API PATCH /visits/:id]', err);
    res.status(500).json({
      error: 'Failed to update visit',
      details: err instanceof Error ? err.message : String(err),
    });
  }
});

router.get('/analytics/traffic-telemetry', requireAuth, async (req: AuthRequest, res) => {
  try {
    const authUser = req.user!;
    if (!['admin', 'guard', 'warden'].includes(authUser.role)) {
      return res.status(403).json({ error: 'Forbidden: Restricted to Security Authorities (Admin, Guard, Warden)' });
    }

    const insideStudents = await prisma.student.count({
      where: { status: 'inside' },
    });

    const outStudents = await prisma.student.count({
      where: { status: 'out_day' },
    });
    const leaveStudents = await prisma.student.count({
      where: { status: 'on_leave' },
    });

    const activeVisits = await prisma.visit.findMany({
      where: {
        status: 'approved',
        check_in_time: { not: null },
        check_out_time: null,
      },
      include: { visitor: true, host: true },
    });

    const now = new Date();
    const overstayThresholdMs = 4 * 60 * 60 * 1000;

    const overstayedVisits = activeVisits.filter((v) => {
      if (v.expected_out_time && new Date(v.expected_out_time) < now) return true;
      if (v.check_in_time && now.getTime() - new Date(v.check_in_time).getTime() > overstayThresholdMs) return true;
      return false;
    });

    const activeVisitorsCount = activeVisits.length;
    const campusSafeCapacity = 1000;
    const currentCampusPopulation = insideStudents + activeVisitorsCount;
    const occupancyPercentage = Math.min(100, Math.round((currentCampusPopulation / campusSafeCapacity) * 100));

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayVisits, todayStudentMovements] = await Promise.all([
      prisma.visit.findMany({
        where: {
          OR: [
            { check_in_time: { gte: todayStart } },
            { check_out_time: { gte: todayStart } },
          ],
        },
        select: { check_in_time: true, check_out_time: true },
      }),
      prisma.studentMovement.findMany({
        where: {
          OR: [
            { entry_time: { gte: todayStart } },
            { exit_time: { gte: todayStart } },
          ],
        },
        select: { entry_time: true, exit_time: true },
      }),
    ]);

    const hourlyDistribution: Array<{ hour: string; entries: number; exits: number; isNight: boolean }> = [];
    for (let h = 0; h < 24; h += 2) {
      const label = `${h.toString().padStart(2, '0')}:00`;
      let entries = 0;
      let exits = 0;
      const isNight = h < 6 || h >= 22;

      todayVisits.forEach((v) => {
        if (v.check_in_time) {
          const inHour = new Date(v.check_in_time).getHours();
          if (inHour >= h && inHour < h + 2) entries++;
        }
        if (v.check_out_time) {
          const outHour = new Date(v.check_out_time).getHours();
          if (outHour >= h && outHour < h + 2) exits++;
        }
      });

      todayStudentMovements.forEach((m) => {
        if (m.entry_time) {
          const inHour = new Date(m.entry_time).getHours();
          if (inHour >= h && inHour < h + 2) entries++;
        }
        if (m.exit_time) {
          const outHour = new Date(m.exit_time).getHours();
          if (outHour >= h && outHour < h + 2) exits++;
        }
      });

      hourlyDistribution.push({ hour: label, entries, exits, isNight });
    }

    res.json({
      census: {
        currentCampusPopulation,
        campusSafeCapacity,
        occupancyPercentage,
        insideStudents,
        outStudents,
        leaveStudents,
        activeVisitorsCount,
        overstayCount: overstayedVisits.length,
      },
      overstayedVisits: overstayedVisits.map((v) => ({
        id: v.id,
        visitorName: v.visitor?.name,
        visitorPhone: v.visitor?.phone,
        purpose: v.purpose,
        checkInTime: v.check_in_time,
        hostName: v.host?.name || 'Academic Block',
        overstayMinutes: v.check_in_time
          ? Math.round((now.getTime() - new Date(v.check_in_time).getTime()) / (1000 * 60))
          : 0,
        escortName: v.escort_name,
        overstayNotified: v.overstay_notified,
      })),
      hourlyDistribution,
    });
  } catch (err: any) {
    console.error('Error calculating traffic telemetry:', err);
    res.status(500).json({ error: 'Failed to retrieve traffic telemetry.' });
  }
});

router.post('/self-service-kiosk', async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      purpose,
      category = 'guest',
      vehicle_number,
      photo_url,
    } = req.body;

    if (!name || !phone || !purpose) {
      return res.status(400).json({ error: 'Name, Phone, and Purpose of visit are required.' });
    }

    const cleanPhone = phone.trim();
    const cleanEmail = email?.trim() || `${cleanPhone}@kiosk.guest`;

    let visitor = await prisma.visitor.findFirst({
      where: {
        OR: [{ phone: cleanPhone }, { email: cleanEmail }],
      },
    });

    if (!visitor) {
      visitor = await prisma.visitor.create({
        data: {
          name: name.trim(),
          email: cleanEmail,
          phone: cleanPhone,
          photo_url: photo_url || null,
        },
      });
    } else if (photo_url && !visitor.photo_url) {
      visitor = await prisma.visitor.update({
        where: { id: visitor.id },
        data: { photo_url },
      });
    }

    let host = await prisma.host.findFirst({
      where: { role: 'admin' },
    });
    if (!host) {
      host = await prisma.host.findFirst();
    }

    const validFrom = new Date();
    const validUntil = new Date(Date.now() + 8 * 60 * 60 * 1000);
    const isVIP = category === 'vip';

    const visit = await prisma.visit.create({
      data: {
        visitor_id: visitor.id,
        host_id: host ? host.id : undefined,
        purpose: `${category === 'courier' ? '[DELIVERY/COURIER] ' : category === 'interview' ? '[INTERVIEW] ' : category === 'vip' ? '[VIP DIGNITARY] ' : ''}${purpose.trim()}`,
        status: 'approved',
        approved_at: new Date(),
        check_in_time: new Date(),
        valid_from: validFrom,
        valid_until: validUntil,
        vehicle_number: vehicle_number?.trim() || null,
        is_vip: isVIP,
        vip_category: isVIP ? 'Dignitary Guest' : null,
        entry_gate: 'Main Gate',
      },
      include: {
        visitor: true,
        host: true,
      },
    });

    const qrPayload = JSON.stringify({
      vId: visit.id,
      vName: visitor.name,
      vPhone: visitor.phone,
      type: 'WALK_IN_PASS',
      validUntil: validUntil.toISOString(),
    });

    res.status(201).json({
      visit,
      qrPayload,
      message: 'Self Check-in successful. Thermal Badge Generated.',
    });
  } catch (err: any) {
    console.error('Self service kiosk error:', err);
    res.status(500).json({ error: 'Failed to process self-service registration.' });
  }
});

router.patch('/:id/escort', requireAuth, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { escort_name } = req.body;

    const officer = escort_name?.trim() || req.user?.name || 'Security Patrol Alpha';

    const updated = await prisma.visit.update({
      where: { id },
      data: {
        overstay_notified: true,
        escort_name: officer,
      },
      include: { visitor: true, host: true },
    });

    res.json({
      visit: updated,
      message: `Security Escort (${officer}) dispatched for visitor.`,
    });
  } catch (err: any) {
    console.error('Error dispatching escort:', err);
    res.status(500).json({ error: 'Failed to dispatch security escort.' });
  }
});

export default router;
