import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { paginationQuerySchema } from '../schemas/booking.js';
import * as favoriteService from '../services/favoriteService.js';
import { parseId } from '../utils/parseId.js';

const router = Router();

router.use(authenticate, requireRole('customer'));

router.get('/', validate(paginationQuerySchema, 'query'), async (req, res) => {
  res.json(await favoriteService.listFavorites(req.user.id, req.validated.query));
});

// список id для отображения сердечек на карточках
router.get('/ids', async (req, res) => {
  res.json({ eventIds: await favoriteService.listFavoriteIds(req.user.id) });
});

router.post('/:eventId', async (req, res) => {
  const favorite = await favoriteService.addFavorite(req.user.id, parseId(req.params.eventId));
  res.status(201).json({ favorite });
});

router.delete('/:eventId', async (req, res) => {
  await favoriteService.removeFavorite(req.user.id, parseId(req.params.eventId));
  res.json({ success: true, message: 'Removed from favorites' });
});

export default router;