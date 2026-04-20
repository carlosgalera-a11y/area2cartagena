import type { AiProvider } from './types';
import { deepseek } from './deepseek';
import { gemini } from './gemini';
import { nas } from './nas';

export const PROVIDERS: Record<AiProvider['id'], AiProvider> = {
  deepseek,
  gemini,
  nas,
};

export const DEFAULT_ORDER: AiProvider['id'][] = ['deepseek', 'gemini', 'nas'];
export const STRICT_EU_ORDER: AiProvider['id'][] = ['gemini', 'nas'];
export const PREFER_LOCAL_ORDER: AiProvider['id'][] = ['nas', 'deepseek', 'gemini'];

export type { AiProvider, AskOptions, ProviderAnswer } from './types';
