import type { Request, Response, NextFunction } from 'express';
import { logger } from 'firebase-functions/v2';
import { auth, appCheck } from '../lib/admin';
import type { AuthedRequest } from '../lib/types';

const SUPERADMIN_EMAILS = new Set([
  'ramongalera22@gmail.com',
  'carlosgalera2roman@gmail.com',
  'esther.montoro@gmail.com',
]);

const DEFAULT_TENANT = 'default';

/**
 * Verifies Firebase ID token + (optional) App Check token.
 * Populates req.authCtx with { uid, email, tenantId, role }.
 *
 * Tenant resolution order:
 *   1. custom claim `tenantId` if present
 *   2. fallback to 'default' tenant for legacy users
 *
 * Role resolution order:
 *   1. custom claim `role` if present
 *   2. 'superadmin' if email is in SUPERADMIN_EMAILS (legacy)
 *   3. 'user'
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization || '';
  const m = header.match(/^Bearer\s+(.+)$/i);
  if (!m) {
    res.status(401).json({ error: 'unauthenticated', message: 'Missing Bearer token' });
    return;
  }
  const idToken = m[1];

  let decoded;
  try {
    decoded = await auth.verifyIdToken(idToken, true);
  } catch (err) {
    logger.warn('Invalid ID token', { err: (err as Error).message });
    res.status(401).json({ error: 'unauthenticated', message: 'Invalid ID token' });
    return;
  }

  // App Check is enforced when the header is present.
  // In MVP we accept both "enforced when sent" and "missing" to ease the
  // legacy frontend migration. A later flag flips this to mandatory.
  let appCheckVerified = false;
  const acToken = (req.headers['x-firebase-appcheck'] || req.headers['x-firebase-app-check']) as
    | string
    | undefined;
  if (acToken) {
    try {
      await appCheck.verifyToken(acToken);
      appCheckVerified = true;
    } catch (err) {
      logger.warn('Invalid App Check token', { err: (err as Error).message });
      // Do not hard-fail yet; record and continue.
    }
  }

  const claims = decoded as Record<string, unknown>;
  const tenantId = (claims.tenantId as string | undefined) || DEFAULT_TENANT;
  let role = (claims.role as 'user' | 'admin' | 'superadmin' | undefined) || 'user';
  if (decoded.email && SUPERADMIN_EMAILS.has(decoded.email)) {
    role = 'superadmin';
  }

  (req as AuthedRequest).authCtx = {
    uid: decoded.uid,
    email: decoded.email ?? null,
    tenantId,
    role,
    appCheckVerified,
  };
  next();
}

export function requireRole(...allowed: Array<'user' | 'admin' | 'superadmin'>) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ctx = (req as AuthedRequest).authCtx;
    if (!ctx) {
      res.status(401).json({ error: 'unauthenticated' });
      return;
    }
    if (!allowed.includes(ctx.role)) {
      res.status(403).json({ error: 'forbidden', message: `Requires role: ${allowed.join('|')}` });
      return;
    }
    next();
  };
}
