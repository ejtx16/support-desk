import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { errorHandler } from './middleware/errorHandler';
import { notFound } from './middleware/notFound';
import { apiRouter } from './routes';

/** Builds the Express app. Kept separate from `listen()` so tests can mount it with supertest. */
export function createApp() {
  const app = express();

  app.use(helmet());
  // Lets a public page (e.g. the GitHub Pages client) call an API on the tester's localhost:
  // Chrome sends this preflight header for public -> private network requests.
  app.use((req, res, next) => {
    if (req.headers['access-control-request-private-network'] === 'true') {
      res.setHeader('Access-Control-Allow-Private-Network', 'true');
    }
    next();
  });
  // Auth is a bearer token (no cookies), so `*` is acceptable for a local test server.
  const origins = env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(cors({ origin: origins.includes('*') ? true : origins }));
  app.use(express.json({ limit: '100kb' }));
  if (env.NODE_ENV !== 'test') app.use(morgan('dev'));

  app.use('/api', apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
