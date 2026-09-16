import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { TodoSchema, type Todo } from '../domain/todo.js';
import { z } from 'zod';

const StoreSchema = z
  .object({
    version: z.literal(1),
    todos: z.array(TodoSchema),
  })
  .strict();

export interface TodoRepository {
  list(): Promise<Todo[]>;
  replaceAll(todos: Todo[]): Promise<void>;
}

export class JsonTodoRepository implements TodoRepository {
  constructor(private readonly filePath: string) {}

  async list(): Promise<Todo[]> {
    try {
      const raw = await readFile(this.filePath, 'utf8');
      const parsed = StoreSchema.parse(JSON.parse(raw));
      return parsed.todos;
    } catch (error) {
      if (isMissingFile(error)) {
        return [];
      }
      throw error;
    }
  }

  async replaceAll(todos: Todo[]): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });

    const tempPath = `${this.filePath}.tmp`;
    const content = JSON.stringify({ version: 1, todos }, null, 2);

    // Write-then-rename gives the local single-user app an atomic persistence boundary.
    await writeFile(tempPath, content, 'utf8');
    await rename(tempPath, this.filePath);
  }
}

function isMissingFile(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
