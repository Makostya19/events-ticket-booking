import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { createBookingSchema, bookingQuerySchema } from '../schemas/booking.js';
import * as bookingService from '../services/bookingService.js';
import { parseId } from '../utils/parseId.js';

const router = Router();

router.use(authenticate, requireRole('customer'));

router.post('/', validate(createBookingSchema), async (req, res) => {
  const booking = await bookingService.createBooking(req.user.id, req.validated.body);
  res.status(201).json({ booking });
});

router.get('/my', validate(bookingQuerySchema, 'query'), async (req, res) => {
  res.json(await bookingService.listMyBookings(req.user.id, req.validated.query));
});

router.patch('/:id/cancel', async (req, res) => {
  const booking = await bookingService.cancelBooking(parseId(req.params.id), req.user.id);
  res.json({ booking });
});

export default router;