import { describe, expect, it } from 'vitest';
import supertest from 'supertest';
import { createApp } from '../src/app.js';

describe('Todo HTTP API', () => {
  it('reports health', async () => {
    const response = await supertest(createApp()).get('/health');
    expect(response.status).toBe(200);
    const body = response.body as { status: string };
    expect(body.status).toBe('ok');
  });

  it('rejects invalid input', async () => {
    const response = await supertest(createApp()).post('/api/todos').send({
      title: '',
    });

    expect(response.status).toBe(400);
  });

  it('creates a task', async () => {
    const response = await supertest(createApp())
      .post('/api/todos')
      .send({
        title: 'Test task',
        notes: 'Details',
        priority: 'high',
        dueDate: null,
        tags: ['demo'],
      });

    expect(response.status).toBe(201);
    const body = response.body as { item: { title: string } };
    expect(body.item.title).toBe('Test task');
  });
});
