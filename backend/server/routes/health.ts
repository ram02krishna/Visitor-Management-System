import express from 'express';
import { prisma } from '../lib/prisma.js';

const router = express.Router();

interface ModuleHealth {
  status: 'UP' | 'DOWN' | 'DEGRADED';
  latencyMs?: number;
  recordsCount?: number;
  message?: string;
}

router.get('/ping', (_req, res) => {
  res.status(200).json({
    status: 'ok',
    message: 'pong',
    timestamp: new Date().toISOString(),
  });
});

router.get('/ready', async (_req, res) => {
  try {
    const start = performance.now();
    await prisma.$queryRaw`SELECT 1 as ping`;
    const latencyMs = Math.round(performance.now() - start);

    res.status(200).json({
      status: 'ready',
      database: 'connected',
      dbLatencyMs: latencyMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'not_ready',
      database: 'disconnected',
      error: err instanceof Error ? err.message : String(err),
      timestamp: new Date().toISOString(),
    });
  }
});

router.get('/', async (_req, res) => {
  const startTime = performance.now();
  const timestamp = new Date().toISOString();

  const modules: Record<string, ModuleHealth> = {};
  let isDbHealthy = true;

  const dbStart = performance.now();
  try {
    const [
      hostCount,
      studentCount,
      visitCount,
      visitorCount,
      movementCount,
      deptCount,
      vehicleCount,
      lostFoundCount,
    ] = await Promise.all([
      prisma.host.count(),
      prisma.student.count(),
      prisma.visit.count(),
      prisma.visitor.count(),
      prisma.studentMovement.count(),
      prisma.department.count(),
      prisma.vehiclePass.count(),
      prisma.lostAndFoundItem.count(),
    ]);

    const dbLatencyMs = Math.round(performance.now() - dbStart);

    modules['database'] = {
      status: 'UP',
      latencyMs: dbLatencyMs,
      message: 'PostgreSQL connection active via Prisma driver adapter',
    };

    modules['auth_users'] = {
      status: 'UP',
      recordsCount: hostCount,
      message: `${hostCount} registered accounts across campus roles`,
    };

    modules['student_hostel_hub'] = {
      status: 'UP',
      recordsCount: studentCount,
      message: `${studentCount} student residents across 10-floor matrix`,
    };

    modules['gate_telemetry_movements'] = {
      status: 'UP',
      recordsCount: movementCount,
      message: `${movementCount} gate passage telemetry records`,
    };

    modules['visits_management'] = {
      status: 'UP',
      recordsCount: visitCount,
      message: `${visitCount} visitor passes registered`,
    };

    modules['visitors_directory'] = {
      status: 'UP',
      recordsCount: visitorCount,
      message: `${visitorCount} unique visitors in registry`,
    };

    modules['departments'] = {
      status: 'UP',
      recordsCount: deptCount,
      message: `${deptCount} campus academic/administrative departments`,
    };

    modules['vehicles_parking'] = {
      status: 'UP',
      recordsCount: vehicleCount,
      message: `${vehicleCount} vehicle parking passes`,
    };

    modules['lost_and_found'] = {
      status: 'UP',
      recordsCount: lostFoundCount,
      message: `${lostFoundCount} inventory items logged`,
    };
  } catch (dbErr) {
    isDbHealthy = false;
    modules['database'] = {
      status: 'DOWN',
      message: dbErr instanceof Error ? dbErr.message : 'Database query failed',
    };
  }

  const hasCloudinary = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
  modules['cloudinary_storage'] = {
    status: hasCloudinary ? 'UP' : 'DEGRADED',
    message: hasCloudinary
      ? 'Cloudinary cloud storage credentials configured'
      : 'Cloudinary environment variables missing or incomplete',
  };

  const hasResend = Boolean(process.env.RESEND_API_KEY);
  modules['email_service'] = {
    status: hasResend ? 'UP' : 'DEGRADED',
    message: hasResend
      ? 'Resend API service configured for transactional notifications'
      : 'RESEND_API_KEY not provided (email notifications disabled)',
  };

  const memoryUsage = process.memoryUsage();
  const formatMB = (bytes: number) => `${Math.round((bytes / 1024 / 1024) * 100) / 100} MB`;

  const totalLatencyMs = Math.round(performance.now() - startTime);
  const overallStatus = isDbHealthy ? 'healthy' : 'unhealthy';
  const statusCode = isDbHealthy ? 200 : 503;

  res.status(statusCode).json({
    status: overallStatus,
    service: 'IIIT Nagpur Visitor Management System (VMS)',
    version: '1.0.0',
    timestamp,
    totalLatencyMs,
    uptimeSeconds: Math.floor(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
    system: {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memory: {
        rss: formatMB(memoryUsage.rss),
        heapTotal: formatMB(memoryUsage.heapTotal),
        heapUsed: formatMB(memoryUsage.heapUsed),
        external: formatMB(memoryUsage.external),
      },
    },
    apis: {
      auth: '/api/auth',
      visits: '/api/visits',
      visitors: '/api/visitors',
      students: '/api/students',
      hosts: '/api/hosts',
      departments: '/api/departments',
      vehicles: '/api/vehicles',
      emergency: '/api/emergency',
      lostAndFound: '/api/lost-and-found',
      upload: '/api/upload',
      analytics: '/api/analytics',
      health: '/api/health',
    },
    modules,
  });
});

export default router;
