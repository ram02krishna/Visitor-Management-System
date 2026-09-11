import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import uploadRoutes from './routes/upload.js';
import visitsRoutes from './routes/visits.js';
import visitorsRoutes from './routes/visitors.js';
import hostsRoutes from './routes/hosts.js';
import departmentsRoutes from './routes/departments.js';
import analyticsRoutes from './routes/analytics.js';
import studentsRoutes from './routes/students.js';
import emergencyRoutes from './routes/emergency.js';
import vehiclesRoutes from './routes/vehicles.js';
import lostAndFoundRoutes from './routes/lostAndFound.js';
import healthRoutes from './routes/health.js';

const app = express();

const rawOrigins = process.env.FRONTEND_URL ?? 'http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:3000';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim());

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);

      const isLocalhost = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
      if (isLocalhost || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      callback(new Error(`CORS: origin "${origin}" is not allowed`));
    },
    credentials: true,
  })
);

app.use(express.json());

app.get('/', (_req, res) => {
  res.send('IIIT Nagpur VMS API is running! 🚀');
});

app.use('/api/health', healthRoutes);
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/visits', visitsRoutes);
app.use('/api/visitors', visitorsRoutes);
app.use('/api/hosts', hostsRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/students', studentsRoutes);
app.use('/api/emergency', emergencyRoutes);
app.use('/api/vehicles', vehiclesRoutes);
app.use('/api/lost-and-found', lostAndFoundRoutes);

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    error: err.message || 'Internal Server Error',
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
  });
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
