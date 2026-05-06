/**
 * MockProvider — in-memory ModelProvider for tests.
 *
 * Configure with a list of canned responses (or a function that builds one);
 * each `generate()` call shifts the next response off the queue. Captures every
 * GenerateRequest so tests can assert on what was sent.
 */

import {
  type GenerateRequest,
  type GenerateResponse,
  type ModelProvider,
  ProviderError,
} from './types.js';

export type CannedResponse = string | Partial<GenerateResponse> | ((req: GenerateRequest) => GenerateResponse | Promise<GenerateResponse>);

export class MockProvider implements ModelProvider {
  readonly name = 'mock';
  readonly requests: GenerateRequest[] = [];
  private readonly queue: CannedResponse[];

  constructor(responses: CannedResponse[]) {
    this.queue = [...responses];
  }

  async generate(req: GenerateRequest): Promise<GenerateResponse> {
    this.requests.push(req);
    const next = this.queue.shift();
    if (next === undefined) {
      throw new ProviderError(`MockProvider: no more queued responses (got ${this.requests.length} requests)`);
    }
    if (typeof next === 'function') {
      return next(req);
    }
    if (typeof next === 'string') {
      return defaultResponse(req, next);
    }
    return { ...defaultResponse(req, next.text ?? ''), ...next };
  }
}

function defaultResponse(req: GenerateRequest, text: string): GenerateResponse {
  return {
    text,
    content: text ? [{ type: 'text', text }] : [],
    model: req.model,
    stopReason: 'end_turn',
    usage: { inputTokens: 100, outputTokens: 50 },
  };
}
