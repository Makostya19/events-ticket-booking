import { AppError } from './AppError.js';

export function parseId(value) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) {
    throw new AppError(400, 'INVALID_ID', 'Invalid id');
  }
  return id;
}