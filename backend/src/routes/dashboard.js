import { Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth.js';
import * as dashboardService from '../services/dashboardService.js';

export const customerDashboardRouter = Router();
customerDashboardRouter.get('/my', authenticate, requireRole('customer'), async (req, res) => {
  res.json(await dashboardService.customerDashboard(req.user.id));
});

export const adminDashboardRouter = Router();
adminDashboardRouter.get('/', authenticate, requireRole('admin'), async (req, res) => {
  res.json(await dashboardService.adminDashboard());
});