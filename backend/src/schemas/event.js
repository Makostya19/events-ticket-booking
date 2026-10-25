import { z } from 'zod';

const STATUSES = ['draft', 'published', 'cancelled', 'completed'];
const MAX_YEAR = 2100;
const MAX_PRICE = 10_000_000;
const MAX_TICKETS = 100_000;

const text = (label, min, max) =>
  z
    .string(`${label} is required`)
    .trim()
    .min(min, min === 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const dateField = z.coerce
  .date({ error: 'Invalid date' })
  .refine((d) => d.getFullYear() <= MAX_YEAR, `Year must be ${MAX_YEAR} or earlier`);

const eventBase = z.object({
  title: text('Title', 3, 120),
  description: text('Description', 20, 5000),
  category: text('Category', 1, 60),
  city: text('City', 1, 80),
  venue: text('Venue', 1, 120),
  startsAt: dateField,
  endsAt: dateField,
  price: z.coerce
    .number({ error: 'Price must be a number' })
    .min(0, 'Price must be zero or greater')
    .max(MAX_PRICE, `Price can’t exceed ${MAX_PRICE.toLocaleString('en-US')}`),
  totalTickets: z.coerce
    .number({ error: 'Total tickets must be a number' })
    .int('Total tickets must be a whole number')
    .min(1, 'Total tickets must be greater than zero')
    .max(MAX_TICKETS, `Total tickets can’t exceed ${MAX_TICKETS.toLocaleString('en-US')}`),
});

const endsAfterStart = [
  (d) => d.endsAt > d.startsAt,
  { path: ['endsAt'], message: 'End date must be after start date' },
];

export const createEventSchema = eventBase
  .refine(...endsAfterStart)
  .refine((d) => d.startsAt > new Date(), {
    path: ['startsAt'],
    message: 'Start date must be in the future',
  });

export const updateEventSchema = eventBase.refine(...endsAfterStart);

export const statusSchema = z.object({
  status: z.enum(STATUSES, { error: 'Invalid status' }),
});

// пустые значения из query-строки (?city=) считаем отсутствующими
const blank = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

export const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  search: blank(z.string().trim().max(100).optional()),
  category: blank(z.string().trim().max(60).optional()),
  city: blank(z.string().trim().max(80).optional()),
  status: blank(z.enum(STATUSES).optional()),
  dateFrom: blank(z.coerce.date().optional()),
  dateTo: blank(z.coerce.date().optional()),
  priceMin: blank(z.coerce.number().min(0).optional()),
  priceMax: blank(z.coerce.number().min(0).optional()),
  sort: z.enum(['newest', 'date_asc', 'price_asc', 'price_desc']).default('newest'),
});