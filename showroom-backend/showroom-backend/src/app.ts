import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

// Sprint 1 Routes
import authRoutes from './modules/auth/auth.routes';
import usersRoutes from './modules/users/users.routes';
import carsRoutes from './modules/cars/cars.routes';
import branchesRoutes from './modules/branches/branches.routes';

// Sprint 2 Routes
import ordersRoutes from './modules/orders/orders.routes';
import paymentsRoutes from './modules/payments/payments.routes';
import contractsRoutes from './modules/contracts/contracts.routes';
import testDrivesRoutes from './modules/test-drives/test-drives.routes';
import { carReviewsRouter, reviewsRouter } from './modules/reviews/reviews.routes';
import dashboardRoutes from './modules/dashboard/dashboard.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import contactRoutes from './modules/contact/contact.routes';

// Sprint 3
import chatRoutes from './modules/chat/chat.routes';

const app: Application = express();

if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1);

// Baseline security headers without an extra runtime dependency.
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ─── MIDDLEWARES ──────────────────────────────────────────────────────────────

const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(new Error('Origin không được CORS cho phép'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── ROUTES ───────────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Sprint 1
app.use('/api/auth',      authRoutes);
app.use('/api/users',     usersRoutes);
app.use('/api/cars',      carsRoutes);
app.use('/api/branches',  branchesRoutes);

// Sprint 2
app.use('/api/orders',                          ordersRoutes);
app.use('/api/orders/:id/payments',             paymentsRoutes);
app.use('/api/orders/:id/contract',             contractsRoutes);
app.use('/api/test-drives',                     testDrivesRoutes);
app.use('/api/cars/:id/reviews',                carReviewsRouter);
app.use('/api/reviews',                         reviewsRouter);
app.use('/api/dashboard',                       dashboardRoutes)
app.use('/api/maintenance',                     maintenanceRoutes)
app.use('/api/contact',                         contactRoutes)

// Sprint 3
app.use('/api/chat',                            chatRoutes)


// ─── 404 HANDLER ─────────────────────────────────────────────────────────────

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, message: 'Endpoint không tồn tại' });
});

// ─── GLOBAL ERROR HANDLER ────────────────────────────────────────────────────

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('[GlobalError]', err);
  res.status(500).json({ success: false, message: 'Lỗi hệ thống' });
});

export default app;
