import { z } from 'zod';
import { blank, paginationSchema } from './common.js';

export const userQuerySchema = paginationSchema.extend({
  search: blank(z.string().trim().max(100).optional()),
  role: blank(z.enum(['customer', 'admin']).optional()),
  status: blank(z.enum(['active', 'blocked']).optional()),
});

export const updateUserSchema = z
  .object({
    role: z.enum(['customer', 'admin'], { error: 'Invalid role' }).optional(),
    status: z.enum(['active', 'blocked'], { error: 'Invalid status' }).optional(),
  })
  .refine((d) => d.role !== undefined || d.status !== undefined, {
    message: 'Provide role or status',
  });

export const updateProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Name must be at least 2 characters')
      .max(80, 'Name must be at most 80 characters'),
    currentPassword: z.string().optional(),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(72, 'Password is too long')
      .optional(),
  })
  .refine((d) => !d.newPassword || d.currentPassword, {
    path: ['currentPassword'],
    message: 'Current password is required to set a new password',
  });