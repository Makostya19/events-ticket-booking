import { z } from 'zod';

// пустые значения из query-строки (?status=) считаем отсутствующими
export const blank = (schema) => z.preprocess((v) => (v === '' ? undefined : v), schema);

export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});