import multer from 'multer';
import crypto from 'node:crypto';
import path from 'node:path';
import { AppError } from '../utils/AppError.js';

const ALLOWED = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const uploadImage = multer({
  storage: multer.diskStorage({
    destination: path.resolve('uploads'),
    filename: (req, file, cb) => cb(null, `${crypto.randomUUID()}${ALLOWED[file.mimetype]}`),
  }),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED[file.mimetype]) {
      return cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only jpg, png and webp images are allowed'));
    }
    cb(null, true);
  },
}).single('image');