import { logger } from 'firebase-functions/v2';
import { GEMINI_API_KEY } from '../../lib/secrets';

const MODEL = 'gemini-2.5-flash';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export interface VisionAskOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface VisionAnswer {
  answer: string;
  source: 'gemini-vision';
  usage?: { inputTokens?: number; outputTokens?: number };
}

/**
 * Gemini 2.5 Flash con entrada multimodal (texto + imagen inline).
 * CLAUDE.md "Política IA": type='vision' → Gemini 2.5 Flash primario.
 * Region UE vía Google AI endpoint.
 */
export async function askGeminiVision(
  prompt: string,
  imageBase64: string,
  mimeType: string,
  opts: VisionAskOptions = {},
): Promise<VisionAnswer> {
  const key = GEMINI_API_KEY.value();
  if (!key) throw new Error('gemini_key_missing');
  if (!/^(image\/(jpeg|png|webp|gif|heic|heif))$/i.test(mimeType)) {
    throw new Error('unsupported_mime_type');
  }

  const ctrl = new AbortController();
  const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 60000);
  try {
    const url = `${ENDPOINT}?key=${encodeURIComponent(key)}`;
    const body: Record<string, unknown> = {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            { inline_data: { mime_type: mimeType, data: imageBase64 } },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: opts.maxTokens ?? 2000,
        temperature: opts.temperature ?? 0.3,
      },
    };
    if (opts.systemPrompt) {
      body.systemInstruction = { role: 'system', parts: [{ text: opts.systemPrompt }] };
    }

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: ctrl.signal,
      body: JSON.stringify(body),
    });
    if (!r.ok) {
      const text = await r.text().catch(() => '');
      logger.warn('Gemini vision non-OK', { status: r.status, body: text.slice(0, 300) });
      throw new Error(`gemini_vision_http_${r.status}`);
    }
    const j = (await r.json()) as any;
    const parts = j?.candidates?.[0]?.content?.parts;
    const answer = Array.isArray(parts)
      ? parts.map((p: any) => p?.text || '').join('').trim()
      : '';
    if (!answer) throw new Error('gemini_vision_empty_response');
    return {
      answer,
      source: 'gemini-vision',
      usage: {
        inputTokens: j?.usageMetadata?.promptTokenCount,
        outputTokens: j?.usageMetadata?.candidatesTokenCount,
      },
    };
  } finally {
    clearTimeout(timeout);
  }
}
