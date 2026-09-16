import { Router } from 'express';
import { z } from 'zod';
import { TodoService } from '../application/todo-service.js';
import { CreateTodoSchema, UpdateTodoSchema } from '../domain/todo.js';

const ListQuerySchema = z
  .object({
    filter: z.enum(['all', 'active', 'completed', 'today', 'overdue']).default('all'),
    search: z.string().max(100).default(''),
  })
  .strict();

const IdListSchema = z
  .object({
    ids: z.array(z.uuid()).min(1).max(500),
    completed: z.boolean(),
  })
  .strict();

export function createTodoRouter(service: TodoService): Router {
  const router = Router();

  router.get('/', async (req, res, next) => {
    try {
      const query = ListQuerySchema.parse(req.query);
      const items = await service.list(query.filter, query.search);
      return res.json({ items });
    } catch (error) {
      next(error);
      return;
    }
  });

  router.get('/:id', async (req, res, next) => {
    try {
      const item = await service.get(req.params.id);
      if (!item) return res.status(404).json({ error: 'Todo not found' });
      return res.json({ item });
    } catch (error) {
      next(error);
      return;
    }
  });

  router.post('/', async (req, res, next) => {
    try {
      const input = CreateTodoSchema.parse(req.body);
      const item = await service.create(input);
      return res.status(201).json({ item });
    } catch (error) {
      next(error);
      return;
    }
  });

  router.patch('/:id', async (req, res, next) => {
    try {
      const input = UpdateTodoSchema.parse(req.body);
      const item = await service.update(req.params.id, input);
      if (!item) return res.status(404).json({ error: 'Todo not found' });
      return res.json({ item });
    } catch (error) {
      next(error);
      return;
    }
  });

  router.delete('/:id', async (req, res, next) => {
    try {
      const deleted = await service.delete(req.params.id);
      if (!deleted) return res.status(404).json({ error: 'Todo not found' });
      return res.status(204).send();
    } catch (error) {
      next(error);
      return;
    }
  });

  router.post('/bulk/completed', async (req, res, next) => {
    try {
      const input = IdListSchema.parse(req.body);
      const changed = await service.setCompleted(input.ids, input.completed);
      return res.json({ changed });
    } catch (error) {
      next(error);
      return;
    }
  });

  router.delete('/bulk/completed', async (_req, res, next) => {
    try {
      const removed = await service.clearCompleted();
      return res.json({ removed });
    } catch (error) {
      next(error);
      return;
    }
  });

  return router;
}
