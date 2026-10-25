import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate } from '../middleware/auth.js';
import { registerSchema, loginSchema } from '../schemas/auth.js';
import * as authService from '../services/authService.js';

const router = Router();

router.post('/register', validate(registerSchema), async (req, res) => {
  const result = await authService.register(req.validated.body);
  res.status(201).json(result);
});

router.post('/login', validate(loginSchema), async (req, res) => {
  const result = await authService.login(req.validated.body);
  res.json(result);
});

router.get('/me', authenticate, (req, res) => {
  res.json({ user: authService.toPublicUser(req.user) });
});

export default router;