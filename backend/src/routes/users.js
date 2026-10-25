import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { updateProfileSchema } from '../schemas/user.js';
import * as userService from '../services/userService.js';

const router = Router();

router.put('/me', authenticate, validate(updateProfileSchema), async (req, res) => {
  const user = await userService.updateProfile(req.user.id, req.validated.body);
  res.json({ user });
});

export default router;