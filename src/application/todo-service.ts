import type { TodoRepository } from '../data/todo-repository.js';
import {
  createTodo,
  updateTodo,
  type CreateTodo,
  type Todo,
  type UpdateTodo,
} from '../domain/todo.js';

export type TodoFilter = 'all' | 'active' | 'completed' | 'today' | 'overdue';

export class TodoService {
  constructor(private readonly repository: TodoRepository) {}

  async list(filter: TodoFilter = 'all', search = ''): Promise<Todo[]> {
    const todos = await this.repository.list();
    const query = search.trim().toLowerCase();

    return todos
      .filter((todo) => matchesFilter(todo, filter))
      .filter((todo) => {
        if (!query) return true;

        const haystack = [todo.title, todo.notes, todo.priority, todo.dueDate ?? '', ...todo.tags]
          .join(' ')
          .toLowerCase();

        return haystack.includes(query);
      });
  }

  async get(id: string): Promise<Todo | undefined> {
    return (await this.repository.list()).find((todo) => todo.id === id);
  }

  async create(input: CreateTodo): Promise<Todo> {
    const todos = await this.repository.list();
    const todo = createTodo(input);
    await this.repository.replaceAll([todo, ...todos]);
    return todo;
  }

  async update(id: string, input: UpdateTodo): Promise<Todo | undefined> {
    const todos = await this.repository.list();
    const index = todos.findIndex((todo) => todo.id === id);

    if (index === -1) return undefined;

    const current = todos[index];
    if (!current) return undefined;

    const updated = updateTodo(current, input);
    todos[index] = updated;
    await this.repository.replaceAll(todos);

    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const todos = await this.repository.list();
    const next = todos.filter((todo) => todo.id !== id);

    if (next.length === todos.length) return false;

    await this.repository.replaceAll(next);
    return true;
  }

  async clearCompleted(): Promise<number> {
    const todos = await this.repository.list();
    const next = todos.filter((todo) => !todo.completed);
    await this.repository.replaceAll(next);
    return todos.length - next.length;
  }

  async setCompleted(ids: string[], completed: boolean): Promise<number> {
    const idSet = new Set(ids);
    const todos = await this.repository.list();
    let changed = 0;

    const next = todos.map((todo) => {
      if (!idSet.has(todo.id) || todo.completed === completed) return todo;
      changed += 1;
      return updateTodo(todo, { completed });
    });

    if (changed > 0) await this.repository.replaceAll(next);
    return changed;
  }
}

function matchesFilter(todo: Todo, filter: TodoFilter): boolean {
  if (filter === 'all') return true;
  if (filter === 'active') return !todo.completed;
  if (filter === 'completed') return todo.completed;

  if (!todo.dueDate) return false;

  const today = localIsoDate();
  if (filter === 'today') return todo.dueDate === today;

  return !todo.completed && todo.dueDate < today;
}

function localIsoDate(): string {
  const date = new Date();
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
