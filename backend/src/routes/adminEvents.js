import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { uploadImage } from '../middleware/upload.js';
import {
  createEventSchema,
  updateEventSchema,
  statusSchema,
  eventQuerySchema,
} from '../schemas/event.js';
import * as eventService from '../services/eventService.js';
import { AppError } from '../utils/AppError.js';
import { parseId } from '../utils/parseId.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', validate(eventQuerySchema, 'query'), async (req, res) => {
  res.json(await eventService.listEvents(req.validated.query, { admin: true }));
});

router.get('/:id', async (req, res) => {
  const event = await eventService.getEvent(parseId(req.params.id), { admin: true });
  res.json({ event });
});

router.post('/', validate(createEventSchema), async (req, res) => {
  const event = await eventService.createEvent(req.validated.body, req.user.id);
  res.status(201).json({ event });
});

router.put('/:id', validate(updateEventSchema), async (req, res) => {
  const event = await eventService.updateEvent(parseId(req.params.id), req.validated.body);
  res.json({ event });
});

router.patch('/:id/status', validate(statusSchema), async (req, res) => {
  const event = await eventService.changeStatus(parseId(req.params.id), req.validated.body.status);
  res.json({ event });
});

router.delete('/:id', async (req, res) => {
  await eventService.deleteEvent(parseId(req.params.id));
  res.json({ success: true, message: 'Event deleted' });
});

router.post('/:id/image', uploadImage, async (req, res) => {
  if (!req.file) throw new AppError(400, 'NO_FILE', 'Image file is required (field name: image)');
  const event = await eventService.setEventImage(
    parseId(req.params.id),
    `/uploads/${req.file.filename}`
  );
  res.json({ event });
});

export default router;