import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JsonTodoRepository } from './data/todo-repository.js';
import { TodoService } from './application/todo-service.js';
import { createTodoRouter } from './http/todo-routes.js';
import { errorHandler } from './http/error-handler.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const publicDir = join(__dirname, '..', 'public');

export function createApp(dataFile = join(publicDir, '..', 'data', 'todos.json')) {
  const app = express();
  const service = new TodoService(new JsonTodoRepository(dataFile));

  app.disable('x-powered-by');
  app.use(helmet());
  app.use(express.json({ limit: '16kb', strict: true }));

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'todo-app' });
  });

  app.use('/api/todos', createTodoRouter(service));
  app.use(express.static(publicDir, { extensions: ['html'] }));

  app.use(errorHandler);

  return app;
}
