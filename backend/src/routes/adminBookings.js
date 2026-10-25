import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { adminBookingQuerySchema } from '../schemas/booking.js';
import * as bookingService from '../services/bookingService.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', validate(adminBookingQuerySchema, 'query'), async (req, res) => {
  res.json(await bookingService.listAllBookings(req.validated.query));
});

export default router;