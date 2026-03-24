// @context decision #examples/docs/context/gate-42.md !critical -- Strict > avoids duplicate processing.
export function shouldProcess(messageTimestamp: number, cutoff: number): boolean {
  return messageTimestamp > cutoff;
}

// @context decision:tradeoff #examples/docs/context/cache-strategy.ctx.md !high -- LRU keeps eviction O(1).
export class LRUCache<K, V> {
  readonly #store = new Map<K, V>();

  get(key: K): V | undefined {
    const value = this.#store.get(key);
    if (value === undefined) {
      return undefined;
    }

    this.#store.delete(key);
    this.#store.set(key, value);
    return value;
  }

  set(key: K, value: V): void {
    this.#store.set(key, value);
  }
}

// @context requirement #examples/docs/requirements/billing-rounding.md !high -- Settlement must match finance rules.
export function roundForSettlement(value: number): number {
  return Math.round(value * 100) / 100;
}

// @context risk:security !critical -- Caller must authenticate the webhook before invoking this parser.
export function parseWebhook(body: string): Record<string, unknown> {
  return JSON.parse(body) as Record<string, unknown>;
}

// @context related #examples/go/payments/gateway.go -- Keep TS and Go gateway behavior aligned.
export function nextRetryCount(base: number): number {
  return base + 1;
}

// @context history -- Replaced recursive retry scheduling after stack growth in production.
export function scheduleRetries(maxRetries: number): number[] {
  const retries: number[] = [];
  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    retries.push(attempt);
  }
  return retries;
}

// @context doc -- This helper keeps call sites focused on business logic rather than HTTP boilerplate.
export async function postJSON(url: string, payload: unknown): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

// @context:decision:assumption -- Legacy syntax still parses; callers assume p99 < 500ms.
export const maxRetries = 3;
