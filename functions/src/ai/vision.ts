import type { Response } from 'express';
import { createHash } from 'node:crypto';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { logger } from 'firebase-functions/v2';
import { db } from '../lib/admin';
import { writeAuditLog } from '../audit/log';
import { consumeDailyQuota } from './quota';
import { redactPII } from './redact';
import { askGeminiVision } from './providers/gemini-vision';
import type { AuthedRequest } from '../lib/types';

const MAX_PROMPT_CHARS = 4000;
const MAX_IMAGE_BYTES = 3 * 1024 * 1024; // 3 MB en base64 (~2 MB binario)
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface VisionBody {
  prompt?: unknown;
  systemPrompt?: unknown;
  imageBase64?: unknown;
  imageMimeType?: unknown;
  /** Admite data URL: "data:image/jpeg;base64,...." */
  imageDataUrl?: unknown;
  maxTokens?: unknown;
  temperature?: unknown;
}

function parseImage(body: VisionBody): { base64: string; mimeType: string } {
  const fromDataUrl = body.imageDataUrl;
  if (typeof fromDataUrl === 'string') {
    const m = fromDataUrl.match(/^data:(image\/[a-z+]+);base64,([A-Za-z0-9+/=]+)$/i);
    if (!m) throw new Error('invalid_data_url');
    return { mimeType: m[1].toLowerCase(), base64: m[2] };
  }
  if (typeof body.imageBase64 === 'string' && typeof body.imageMimeType === 'string') {
    return { mimeType: body.imageMimeType.toLowerCase(), base64: body.imageBase64 };
  }
  throw new Error('missing_image');
}

export async function askVision(req: AuthedRequest, res: Response): Promise<void> {
  const { uid, tenantId } = req.authCtx;
  const body = (req.body || {}) as VisionBody;

  if (typeof body.prompt !== 'string' || body.prompt.length === 0) {
    res.status(400).json({ error: 'invalid_argument', message: 'prompt required' });
    return;
  }
  if (body.prompt.length > MAX_PROMPT_CHARS) {
    res.status(400).json({
      error: 'invalid_argument',
      message: `prompt exceeds ${MAX_PROMPT_CHARS} chars`,
    });
    return;
  }

  let img: { base64: string; mimeType: string };
  try {
    img = parseImage(body);
  } catch (err) {
    res.status(400).json({ error: 'invalid_argument', message: (err as Error).message });
    return;
  }
  if (img.base64.length > MAX_IMAGE_BYTES) {
    res
      .status(413)
      .json({ error: 'payload_too_large', message: `image exceeds ${MAX_IMAGE_BYTES} bytes (base64)` });
    return;
  }

  const rawPrompt = body.prompt;
  const systemPrompt = typeof body.systemPrompt === 'string' ? body.systemPrompt : '';
  const maxTokens =
    typeof body.maxTokens === 'number' && body.maxTokens > 0 && body.maxTokens <= 4096
      ? body.maxTokens
      : undefined;
  const temperature =
    typeof body.temperature === 'number' && body.temperature >= 0 && body.temperature <= 2
      ? body.temperature
      : undefined;

  // 1) Cuota (comparte pool con el endpoint de texto)
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
        metadata: { endpoint: 'vision', limit },
      });
      res
        .status(429)
        .json({ error: 'quota_exhausted', message: `Daily AI quota reached (${limit})`, limit });
      return;
    }
    throw err;
  }

  // 2) Redaccion del prompt (la imagen no se toca; el profesional debe subir imagenes sin datos
  //    identificativos, tal como avisa el disclaimer de scan-ia).
  const { text: cleanPrompt, redactionsApplied, totalRedactions } = redactPII(rawPrompt);

  // 3) Cache — la clave incluye hash de la imagen
  const imageHash = createHash('sha256').update(img.base64).digest('hex');
  const cacheKey = createHash('sha256')
    .update(`vision|${img.mimeType}|${imageHash}|${cleanPrompt}|${systemPrompt}`)
    .digest('hex');
  const cacheRef = db.doc(`tenants/${tenantId}/aiCache/${cacheKey}`);
  const cached = await cacheRef.get();
  if (cached.exists) {
    const createdAt = (cached.get('createdAt') as Timestamp | undefined)?.toMillis() ?? 0;
    if (Date.now() - createdAt < CACHE_TTL_MS) {
      void writeAuditLog({
        uid,
        tenantId,
        action: 'ai.cache_hit',
        resourceType: 'ai',
        ip: req.ip,
        ua: req.get('user-agent') || undefined,
        metadata: { endpoint: 'vision', model: cached.get('model'), promptHash: cacheKey },
      });
      res.status(200).json({
        answer: cached.get('answer'),
        source: 'cache',
        provider: cached.get('model'),
        remaining: quota.remaining,
        euResident: true,
        redactionsApplied,
      });
      return;
    }
  }

  // 4) Gemini 2.5 Flash (primario; UE). Futuro: fallback Qwen-VL via backend.
  let result;
  try {
    result = await askGeminiVision(cleanPrompt, img.base64, img.mimeType, {
      systemPrompt,
      maxTokens,
      temperature,
    });
  } catch (err) {
    const msg = (err as Error).message;
    logger.warn('vision_provider_failed', { provider: 'gemini', msg });
    void writeAuditLog({
      uid,
      tenantId,
      action: 'ai.provider_fail',
      resourceType: 'ai',
      ip: req.ip,
      ua: req.get('user-agent') || undefined,
      metadata: { endpoint: 'vision', tried: 'gemini-vision', redactions: totalRedactions },
    });
    res.status(503).json({
      error: 'all_providers_failed',
      message: 'Vision provider failed',
      errors: [{ provider: 'gemini-vision', error: msg }],
    });
    return;
  }

  // 5) Cache + aiRequests + auditLog
  await cacheRef.set({
    model: result.source,
    answer: result.answer,
    createdAt: FieldValue.serverTimestamp(),
  });

  await db.collection(`tenants/${tenantId}/aiRequests`).add({
    uid,
    provider: result.source,
    endpoint: 'vision',
    promptHash: cacheKey,
    promptLen: cleanPrompt.length,
    answerLen: result.answer.length,
    imageBytes: img.base64.length,
    imageHash,
    mimeType: img.mimeType,
    redactionsApplied: totalRedactions,
    euResident: true,
    inputTokens: result.usage?.inputTokens ?? null,
    outputTokens: result.usage?.outputTokens ?? null,
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
      endpoint: 'vision',
      provider: result.source,
      euResident: true,
      promptHash: cacheKey,
      promptLen: cleanPrompt.length,
      answerLen: result.answer.length,
      imageBytes: img.base64.length,
      redactions: totalRedactions,
    },
  });

  res.status(200).json({
    answer: result.answer,
    source: 'live',
    provider: result.source,
    euResident: true,
    remaining: quota.remaining,
    redactionsApplied,
  });
}
