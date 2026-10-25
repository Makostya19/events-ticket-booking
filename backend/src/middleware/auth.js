import jwt from 'jsonwebtoken';
import { AppError } from '../utils/AppError.js';
import { getUserById } from '../services/authService.js';

export async function authenticate(req, res, next) {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Authentication required');
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid or expired token');
  }

  const user = await getUserById(payload.sub);
  if (!user) throw new AppError(401, 'UNAUTHORIZED', 'User no longer exists');
  if (user.status === 'blocked') {
    throw new AppError(403, 'ACCOUNT_BLOCKED', 'Your account has been blocked');
  }

  req.user = user;
  next();
}

export const requireRole = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    throw new AppError(403, 'FORBIDDEN', 'You do not have permission to do this');
  }
  next();
};