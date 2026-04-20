import type { Response } from 'express';
import { logger } from 'firebase-functions/v2';
import { FieldValue } from 'firebase-admin/firestore';
import { db } from '../lib/admin';
import { writeAuditLog } from '../audit/log';
import { redactPII } from './redact';
import { consumeDailyQuota } from './quota';
import { hashPrompt, readCache, writeCache } from './cache';
import {
  PROVIDERS,
  DEFAULT_ORDER,
  STRICT_EU_ORDER,
  PREFER_LOCAL_ORDER,
  type AiProvider,
} from './providers';
import type { AuthedRequest } from '../lib/types';

const MAX_PROMPT_CHARS = 8000;

interface AskBody {
  prompt?: unknown;
  systemPrompt?: unknown;
  preferLocal?: unknown;
  strictEU?: unknown;
  maxTokens?: unknown;
  temperature?: unknown;
}

function pickOrder(opts: { preferLocal: boolean; strictEU: boolean }): AiProvider['id'][] {
  if (opts.strictEU) return STRICT_EU_ORDER;
  if (opts.preferLocal) return PREFER_LOCAL_ORDER;
  return DEFAULT_ORDER;
}

export async function askAi(req: AuthedRequest, res: Response): Promise<void> {
  const { uid, tenantId } = req.authCtx;
  const body = (req.body || {}) as AskBody;

  if (typeof body.prompt !== 'string' || body.prompt.length === 0) {
    res.status(400).json({ error: 'invalid_argument', message: 'prompt required' });
    return;
  }
  if (body.prompt.length > MAX_PROMPT_CHARS) {
    res
      .status(400)
      .json({ error: 'invalid_argument', message: `prompt exceeds ${MAX_PROMPT_CHARS} chars` });
    return;
  }

  const rawPrompt = body.prompt;
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
  const preferLocal = body.preferLocal === true;
  const strictEU = body.strictEU === true;
  const maxTokens =
    typeof body.maxTokens === 'number' && body.maxTokens > 0 && body.maxTokens <= 4096
      ? body.maxTokens
      : undefined;
  const temperature =
    typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2
      ? body.temperature
      : undefined;

  // 1) Cuota diaria (transaccion)
  let quota: { remaining: number; limit: number; used: number };
  try {
    quota = await consumeDailyQuota(tenantId, uid);
  } catch (err) {
    if ((err as Error).message === 'quota_exhausted') {
      const limit = (err as any).limit as number;
      void writeAuditLog({
        uid,
        tenantId,
        action: 'ai.quota_exhausted',
        resourceType: 'ai',
        ip: req.ip,
        ua: req.get('user-agent') || undefined,
        metadata: { limit },
      });
      res
        .status(429)
        .json({ error: 'quota_exhausted', message: `Daily AI quota reached (${limit})`, limit });
      return;
    }
    throw err;
  }

  // 2) Redaccion previa (defensa adicional contra PII)
  const { text: cleanPrompt, redactionsApplied, totalRedactions } = redactPII(rawPrompt);

  // 3) Cache por hash (clave incluye systemPrompt y modelo "logico")
  const order = pickOrder({ preferLocal, strictEU });
  const cacheKey = hashPrompt(cleanPrompt, systemPrompt, order.join(','));
  const cached = await readCache(tenantId, cacheKey);
  if (cached) {
    void writeAuditLog({
      uid,
      tenantId,
      action: 'ai.cache_hit',
      resourceType: 'ai',
      ip: req.ip,
      ua: req.get('user-agent') || undefined,
      metadata: { model: cached.model, promptHash: cacheKey },
    });
    res.status(200).json({
      answer: cached.answer,
      source: 'cache',
      provider: cached.model,
      remaining: quota.remaining,
      euResident: PROVIDERS[cached.model as AiProvider['id']]?.euResident ?? true,
      redactionsApplied,
    });
    return;
  }

  // 4) Cascada con fallback
  const errors: Array<{ provider: string; error: string }> = [];
  let answer: string | null = null;
  let used: AiProvider | null = null;
  let usage: { inputTokens?: number; outputTokens?: number } | undefined;

  for (const id of order) {
    const provider = PROVIDERS[id];
    try {
      const result = await provider.ask(cleanPrompt, {
        systemPrompt,
        maxTokens,
        temperature,
      });
      answer = result.answer;
      used = provider;
      usage = result.usage;
      break;
    } catch (err) {
      const msg = (err as Error).message;
      errors.push({ provider: id, error: msg });
      logger.warn('ai_provider_failed', { provider: id, msg });
    }
  }

  if (!answer || !used) {
    void writeAuditLog({
      uid,
      tenantId,
      action: 'ai.provider_fail',
      resourceType: 'ai',
      ip: req.ip,
      ua: req.get('user-agent') || undefined,
      metadata: { tried: errors.map((e) => e.provider).join(','), redactions: totalRedactions },
    });
    res.status(503).json({
      error: 'all_providers_failed',
      message: 'No AI provider responded',
      errors,
    });
    return;
  }

  // 5) Guardar cache + auditRequests (sin texto del prompt)
  await writeCache(tenantId, cacheKey, { answer, model: used.id });

  await db
    .collection(`tenants/${tenantId}/aiRequests`)
    .add({
      uid,
      provider: used.id,
      promptHash: cacheKey,
      promptLen: cleanPrompt.length,
      answerLen: answer.length,
      redactionsApplied: totalRedactions,
      euResident: used.euResident,
      inputTokens: usage?.inputTokens ?? null,
      outputTokens: usage?.outputTokens ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

  void writeAuditLog({
    uid,
    tenantId,
    action: 'ai.ask',
    resourceType: 'ai',
    ip: req.ip,
    ua: req.get('user-agent') || undefined,
    metadata: {
      provider: used.id,
      euResident: used.euResident,
      promptHash: cacheKey,
      promptLen: cleanPrompt.length,
      answerLen: answer.length,
      redactions: totalRedactions,
    },
  });

  res.status(200).json({
    answer,
    source: 'live',
    provider: used.id,
    euResident: used.euResident,
    remaining: quota.remaining,
    redactionsApplied,
  });
}
