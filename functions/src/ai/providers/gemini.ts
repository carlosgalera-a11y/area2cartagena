import { logger } from 'firebase-functions/v2';
import { GEMINI_API_KEY } from '../../lib/secrets';
import type { AiProvider, AskOptions, ProviderAnswer } from './types';

const MODEL = 'gemini-2.5-flash-lite';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

export const gemini: AiProvider = {
  id: 'gemini',
  label: 'Gemini 2.5 Flash-Lite',
  euResident: true,
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const key = GEMINI_API_KEY.value();
    if (!key) throw new Error('gemini_key_missing');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
    try {
      const url = `${ENDPOINT}?key=${encodeURIComponent(key)}`;
      const body = {
        systemInstruction: opts.systemPrompt
          ? { role: 'system', parts: [{ text: opts.systemPrompt }] }
          : undefined,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: opts.maxTokens ?? 1500,
          temperature: opts.temperature ?? 0.3,
        },
      };
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: ctrl.signal,
        body: JSON.stringify(body),
      });
      if (!r.ok) {
        const text = await r.text().catch(() => '');
        logger.warn('Gemini non-OK', { status: r.status, body: text.slice(0, 300) });
        throw new Error(`gemini_http_${r.status}`);
      }
      const j = (await r.json()) as any;
      const parts = j?.candidates?.[0]?.content?.parts;
      const answer = Array.isArray(parts)
        ? parts.map((p: any) => p?.text || '').join('').trim()
        : '';
      if (!answer) throw new Error('gemini_empty_response');
      return {
        answer,
        source: 'gemini',
        usage: {
          inputTokens: j?.usageMetadata?.promptTokenCount,
          outputTokens: j?.usageMetadata?.candidatesTokenCount,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
