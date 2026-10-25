import { z } from 'zod';
import { blank, paginationSchema } from './common.js';

export const createBookingSchema = z.object({
  eventId: z.coerce
    .number({ error: 'Event id is required' })
    .int('Invalid event id')
    .min(1, 'Invalid event id'),
  quantity: z.coerce
    .number({ error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
});

export const bookingQuerySchema = paginationSchema.extend({
  status: blank(z.enum(['confirmed', 'cancelled']).optional()),
  sort: z
    .enum(['created_desc', 'created_asc', 'event_date_asc', 'event_date_desc'])
    .default('created_desc'),
});

export const adminBookingQuerySchema = bookingQuerySchema.extend({
  userId: blank(z.coerce.number().int().min(1).optional()),
  eventId: blank(z.coerce.number().int().min(1).optional()),
});

export const paginationQuerySchema = paginationSchema;