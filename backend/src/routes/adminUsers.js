import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { authenticate, requireRole } from '../middleware/auth.js';
import { userQuerySchema, updateUserSchema } from '../schemas/user.js';
import * as userService from '../services/userService.js';
import { parseId } from '../utils/parseId.js';

const router = Router();

router.use(authenticate, requireRole('admin'));

router.get('/', validate(userQuerySchema, 'query'), async (req, res) => {
  res.json(await userService.listUsers(req.validated.query));
});

router.patch('/:id', validate(updateUserSchema), async (req, res) => {
  const user = await userService.updateUser(
    parseId(req.params.id),
    req.user.id,
    req.validated.body
  );
  res.json({ user });
});

export default router;