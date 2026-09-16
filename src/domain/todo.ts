import { randomUUID } from 'node:crypto';
import { z } from 'zod';

export const PrioritySchema = z.enum(['low', 'medium', 'high']);

export const TodoSchema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1).max(160),
  notes: z.string().max(2000),
  completed: z.boolean(),
  priority: PrioritySchema,
  dueDate: z.string().date().nullable(),
  tags: z.array(z.string().min(1).max(32)).max(10),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
}).strict();

export const CreateTodoSchema = TodoSchema.pick({
  title: true,
  notes: true,
  priority: true,
  dueDate: true,
  tags: true,
}).extend({
  title: z.string().trim().min(1).max(160),
  notes: z.string().trim().max(2000).default(''),
  priority: PrioritySchema.default('medium'),
  dueDate: z.string().date().nullable().default(null),
  tags: z.array(z.string().trim().min(1).max(32)).max(10).default([]),
}).strict();

export const UpdateTodoSchema = CreateTodoSchema.partial().extend({
  completed: z.boolean().optional(),
}).strict().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field is required',
});

export type Todo = z.infer<typeof TodoSchema>;
export type CreateTodo = z.infer<typeof CreateTodoSchema>;
export type UpdateTodo = z.infer<typeof UpdateTodoSchema>;
export type Priority = z.infer<typeof PrioritySchema>;

export function createTodo(input: CreateTodo): Todo {
  const now = new Date().toISOString();

  return {
    id: randomUUID(),
    title: input.title,
    notes: input.notes,
    completed: false,
    priority: input.priority,
    dueDate: input.dueDate,
    tags: input.tags,
    createdAt: now,
    updatedAt: now,
  };
}

export function updateTodo(todo: Todo, input: UpdateTodo): Todo {
  return {
    ...todo,
    ...input,
    updatedAt: new Date().toISOString(),
  };
}
