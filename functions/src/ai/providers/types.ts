export interface AskOptions {
  systemPrompt?: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export interface ProviderAnswer {
  answer: string;
  /** Internal short id of the provider that served the request. */
  source: 'deepseek' | 'gemini' | 'nas';
  /** Approximate input/output token usage if exposed by the upstream API. */
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AiProvider {
  id: 'deepseek' | 'gemini' | 'nas';
  /** Friendly label exposed to clients. */
  label: string;
  /** True if the provider keeps the prompt within EU borders. */
  euResident: boolean;
  ask(prompt: string, opts: AskOptions): Promise<ProviderAnswer>;
}
