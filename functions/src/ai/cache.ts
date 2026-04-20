import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { db } from '../lib/admin';

const TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashPrompt(prompt: string, systemPrompt: string, model: string): string {
  return createHash('sha256').update(`${model}|${systemPrompt}|${prompt}`).digest('hex');
}

export interface CachedAnswer {
  answer: string;
  model: string;
  cachedAt: Date;
}

export async function readCache(
  tenantId: string,
  hash: string,
): Promise<CachedAnswer | null> {
  const ref = db.doc(`tenants/${tenantId}/aiCache/${hash}`);
  const snap = await ref.get();
  if (!snap.exists) return null;
  const data = snap.data() || {};
  const createdAt = (data.createdAt as Timestamp | undefined)?.toMillis() ?? 0;
  if (Date.now() - createdAt > TTL_MS) return null;
  return {
    answer: data.answer as string,
    model: data.model as string,
    cachedAt: new Date(createdAt),
  };
}

export async function writeCache(
  tenantId: string,
  hash: string,
  payload: { answer: string; model: string },
): Promise<void> {
  await db.doc(`tenants/${tenantId}/aiCache/${hash}`).set({
    ...payload,
    createdAt: FieldValue.serverTimestamp(),
  });
}
