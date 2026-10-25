import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { eventQuerySchema } from '../schemas/event.js';
import * as eventService from '../services/eventService.js';
import { parseId } from '../utils/parseId.js';

const router = Router();

router.get('/', validate(eventQuerySchema, 'query'), async (req, res) => {
  res.json(await eventService.listEvents(req.validated.query, { admin: false }));
});

router.get('/filters', async (req, res) => {
  res.json(await eventService.getFilterOptions());
});

router.get('/:id', async (req, res) => {
  const event = await eventService.getEvent(parseId(req.params.id), { admin: false });
  res.json({ event });
});

export default router;