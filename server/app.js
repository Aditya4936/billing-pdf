import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createSessions } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/errors.js';
import { authRouter } from './routes/auth.js';
import { profileRouter } from './routes/profile.js';
import { customersRouter } from './routes/customers.js';
import { invoicesRouter } from './routes/invoices.js';
import { statsRouter } from './routes/stats.js';

/** The Express app. Connecting to the database and listening is done in index.js. */
export function createApp(config) {
  const app = express();
  const sessions = createSessions(config);

  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', config.trustProxy);

  app.use(helmet());
  app.use(express.json({ limit: '200kb' }));
  app.use(cookieParser());

  app.get('/api/health', (req, res) => res.json({ ok: true }));
  app.use('/api/auth', authRouter({ sessions }));
  app.use('/api/profile', profileRouter({ sessions }));
  app.use('/api/customers', customersRouter({ sessions }));
  app.use('/api/invoices', invoicesRouter({ sessions }));
  app.use('/api/stats', statsRouter({ sessions }));
  app.use('/api', notFound);

  // Production: serve the built React app (npm run build) from the same address as the API.
  const indexHtml = path.join(config.distDir, 'index.html');
  if (config.isProd && fs.existsSync(indexHtml)) {
    app.use(express.static(config.distDir));
    app.get(/^(?!\/api\/).*/, (req, res) => res.sendFile(indexHtml));
  }

  app.use(errorHandler);
  return app;
}
