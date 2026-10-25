import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import swaggerUi from 'swagger-ui-express';
import { openapi } from './docs/openapi.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import adminUserRoutes from './routes/adminUsers.js';
import eventRoutes from './routes/events.js';
import adminEventRoutes from './routes/adminEvents.js';
import bookingRoutes from './routes/bookings.js';
import adminBookingRoutes from './routes/adminBookings.js';
import favoriteRoutes from './routes/favorites.js';
import { customerDashboardRouter, adminDashboardRouter } from './routes/dashboard.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in .env');
  process.exit(1);
}

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use('/uploads', express.static(path.resolve('uploads')));

app.get('/api/health', (req, res) => res.json({ success: true, status: 'ok' }));

app.get('/api/docs.json', (req, res) => res.json(openapi));
app.use(
  '/api/docs',
  swaggerUi.serve,
  swaggerUi.setup(openapi, {
    customSiteTitle: 'Events Ticket Booking API',
    swaggerOptions: { persistAuthorization: true },
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/admin/events', adminEventRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin/bookings', adminBookingRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/dashboard', customerDashboardRouter);
app.use('/api/admin/dashboard', adminDashboardRouter);

app.use(notFound);
app.use(errorHandler);

const port = process.env.PORT || 5000;
app.listen(port, () => console.log(`API running on http://localhost:${port}`));