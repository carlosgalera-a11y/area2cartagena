import { logger } from 'firebase-functions/v2';
import { NAS_TUNNEL_TOKEN, NAS_TUNNEL_URL } from '../../lib/secrets';
import type { AiProvider, AskOptions, ProviderAnswer } from './types';

/**
 * Llama al NAS local (UGREEN DXP2800) expuesto via Cloudflare Tunnel.
 * El NAS corre el proxy de backend/server.js o un modelo local
 * (Qwen / Gemma) y responde formato OpenAI-compatible.
 *
 * Si no se ha configurado NAS_TUNNEL_URL, la capa se autoinhabilita
 * y se delega en el siguiente provider sin error visible al cliente.
 */
export const nas: AiProvider = {
  id: 'nas',
  label: 'NAS local (Cloudflare Tunnel)',
  euResident: true,
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const url = NAS_TUNNEL_URL.value();
    const token = NAS_TUNNEL_TOKEN.value();
    if (!url) throw new Error('nas_url_missing');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 30000);
    try {
      const r = await fetch(`${url.replace(/\/$/, '')}/api/openrouter`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'X-Tunnel-Token': token } : {}),
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          messages: [
            ...(opts.systemPrompt ? [{ role: 'system', content: opts.systemPrompt }] : []),
            { role: 'user', content: prompt },
          ],
          max_tokens: opts.maxTokens ?? 1500,
          temperature: opts.temperature ?? 0.3,
        }),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => '');
        logger.warn('NAS non-OK', { status: r.status, body: body.slice(0, 300) });
        throw new Error(`nas_http_${r.status}`);
      }
      const j = (await r.json()) as any;
      const answer = j?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('nas_empty_response');
      return { answer, source: 'nas' };
    } finally {
      clearTimeout(timeout);
    }
  },
};
