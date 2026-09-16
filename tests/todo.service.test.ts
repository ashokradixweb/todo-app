import { describe, expect, it } from 'vitest';
import type { Todo } from '../src/domain/todo.js';
import { TodoService } from '../src/application/todo-service.js';
import type { TodoRepository } from '../src/data/todo-repository.js';

class MemoryRepository implements TodoRepository {
  constructor(private items: Todo[] = []) {}

  list(): Promise<Todo[]> {
    return Promise.resolve(structuredClone(this.items));
  }

  replaceAll(todos: Todo[]): Promise<void> {
    this.items = structuredClone(todos);
    return Promise.resolve();
  }
}

describe('TodoService', () => {
  it('creates and updates a task', async () => {
    const service = new TodoService(new MemoryRepository());

    const created = await service.create({
      title: 'Write tests',
      notes: '',
      priority: 'high',
      dueDate: null,
      tags: ['dev'],
    });

    expect(created.completed).toBe(false);

    const updated = await service.update(created.id, {
      completed: true,
    });

    expect(updated?.completed).toBe(true);
  });

  it('clears completed tasks', async () => {
    const repository = new MemoryRepository();
    const service = new TodoService(repository);

    const one = await service.create({
      title: 'Done',
      notes: '',
      priority: 'low',
      dueDate: null,
      tags: [],
    });

    await service.update(one.id, { completed: true });

    await service.create({
      title: 'Active',
      notes: '',
      priority: 'medium',
      dueDate: null,
      tags: [],
    });

    expect(await service.clearCompleted()).toBe(1);
    expect((await service.list()).map((todo) => todo.title)).toEqual(['Active']);
  });
});
