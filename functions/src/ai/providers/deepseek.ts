import { logger } from 'firebase-functions/v2';
import { DEEPSEEK_API_KEY } from '../../lib/secrets';
import type { AiProvider, AskOptions, ProviderAnswer } from './types';

const ENDPOINT = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-chat';

export const deepseek: AiProvider = {
  id: 'deepseek',
  label: 'DeepSeek V3',
  euResident: false,
  async ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer> {
    const key = DEEPSEEK_API_KEY.value();
    if (!key) throw new Error('deepseek_key_missing');

    const ctrl = new AbortController();
    const timeout = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 45000);
    try {
      const r = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${key}`,
        },
        signal: ctrl.signal,
        body: JSON.stringify({
          model: DEFAULT_MODEL,
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
        logger.warn('DeepSeek non-OK', { status: r.status, body: body.slice(0, 300) });
        throw new Error(`deepseek_http_${r.status}`);
      }
      const j = (await r.json()) as any;
      const answer = j?.choices?.[0]?.message?.content?.trim();
      if (!answer) throw new Error('deepseek_empty_response');
      return {
        answer,
        source: 'deepseek',
        usage: {
          inputTokens: j?.usage?.prompt_tokens,
          outputTokens: j?.usage?.completion_tokens,
        },
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
