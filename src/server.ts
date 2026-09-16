import 'dotenv/config';
import { createApp } from './app.js';

const port = Number(process.env.TODO_PORT ?? 3100);
const dataFile = process.env.TODO_DATA_FILE ?? './data/todos.json';

const server = createApp(dataFile).listen(port, () => {
  console.log(`Todo app running at http://localhost:${String(port)}`);
});

function shutdown(signal: string) {
  console.log(`Received ${signal}; shutting down.`);
  server.close(() => process.exit(0));
}

process.once('SIGTERM', () => {
  shutdown('SIGTERM');
});
process.once('SIGINT', () => {
  shutdown('SIGINT');
});
