import express, { type Request, type Response, type NextFunction } from 'express';
import { logger } from 'firebase-functions/v2';
import { requireAuth } from './middleware/auth';
import { askAi } from './ai/ask';
import type { AuthedRequest } from './lib/types';

export function buildApp() {
  const app = express();

  app.use(express.json({ limit: '256kb' }));

  app.disable('x-powered-by');
  app.set('trust proxy', true);

  // CORS — en produccion el rewrite de Hosting hace mismo origen,
  // pero el frontend legacy en GitHub Pages necesita CORS hasta migrar.
  const allowedOrigins = new Set([
    'https://carlosgalera-a11y.github.io',
    'https://area2cartagena.es',
    'https://www.area2cartagena.es',
    'http://localhost:5000',
    'http://localhost:8080',
    'http://127.0.0.1:5000',
  ]);
  app.use((req, res, next) => {
    const origin = req.headers.origin as string | undefined;
    if (origin && allowedOrigins.has(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Vary', 'Origin');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader(
        'Access-Control-Allow-Headers',
        'Authorization, Content-Type, X-Firebase-AppCheck',
      );
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Max-Age', '86400');
    }
    if (req.method === 'OPTIONS') {
      res.status(204).end();
      return;
    }
    next();
  });

  // Logging minimo (para correlacionar con Cloud Logging)
  app.use((req, _res, next) => {
    logger.debug('req', { method: req.method, path: req.path });
    next();
  });

  // Health publico (sin auth) — usado por monitoring
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', ts: new Date().toISOString() });
  });

  // Resto de /api/** requiere autenticacion
  app.use('/api', requireAuth);

  app.post('/api/ai/ask', (req: Request, res: Response, next: NextFunction) =>
    askAi(req as AuthedRequest, res).catch(next),
  );

  // Quien soy (debug + bootstrap del frontend)
  app.get('/api/me', (req: Request, res: Response) => {
    const ctx = (req as AuthedRequest).authCtx;
    res.json({
      uid: ctx.uid,
      email: ctx.email,
      tenantId: ctx.tenantId,
      role: ctx.role,
      appCheckVerified: ctx.appCheckVerified,
    });
  });

  // 404 para rutas /api desconocidas
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not_found' });
  });

  // Error handler
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    logger.error('unhandled_api_error', { err: err?.message, stack: err?.stack });
    res.status(500).json({ error: 'internal', message: 'Unexpected server error' });
  });

  return app;
}
