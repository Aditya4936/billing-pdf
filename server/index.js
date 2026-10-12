import { loadConfig } from './config.js';
import { connectDb, disconnectDb } from './db.js';
import { createApp } from './app.js';

async function main() {
  const config = loadConfig();
  await connectDb(config);

  const server = createApp(config).listen(config.port, () => {
    console.log(`API ready on http://localhost:${config.port} (database: ${config.mongoDb})`);
  });

  const shutdown = () => {
    server.close(() => disconnectDb().finally(() => process.exit(0)));
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
