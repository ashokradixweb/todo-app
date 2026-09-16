import { z } from 'zod';

export const createTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(160),
  })
  .strict();

export const updateTodoSchema = z
  .object({
    title: z.string().trim().min(1).max(160).optional(),
    completed: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });
