export type Failure = { ok: false; error: 'http' | 'network' | 'timeout' | 'cancelled' | 'invalid-response'; status?: number };
export type Result<T> = { ok: true; value: T } | Failure;

/** Failures stay failures. No retries, fabricated scores, or source-as-translation fallback. */
export async function requestJson<T>(
  url: string,
  init: RequestInit,
  options: { parse: (value: unknown) => T; timeoutMs?: number; fetcher?: typeof fetch },
): Promise<Result<T>> {
  const controller = new AbortController();
  const external = init.signal;
  if (external?.aborted) return { ok: false, error: 'cancelled' };
  const timeoutMs = options.timeoutMs ?? 15_000;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new RangeError('Positive timeout required');
  let timer: ReturnType<typeof setTimeout>;
  let onAbort: () => void;
  const cancelled = new Promise<Failure>(resolve => {
    onAbort = () => { controller.abort(); resolve({ ok: false, error: 'cancelled' }); };
    external?.addEventListener('abort', onAbort, { once: true });
  });
  const timeout = new Promise<Failure>(resolve => {
    timer = setTimeout(() => {
      controller.abort();
      resolve({ ok: false, error: 'timeout' });
    }, timeoutMs);
  });
  const request = (async (): Promise<Result<T>> => {
    let response: Response;
    try {
      response = await (options.fetcher ?? fetch)(url, { ...init, signal: controller.signal });
    } catch {
      return { ok: false, error: external?.aborted ? 'cancelled' : controller.signal.aborted ? 'timeout' : 'network' };
    }
    if (!response.ok) return { ok: false, error: 'http', status: response.status };
    try {
      return { ok: true, value: options.parse(await response.json()) };
    } catch {
      return { ok: false, error: 'invalid-response' };
    }
  })();
  try { return await Promise.race([request, timeout, cancelled]); }
  finally {
    clearTimeout(timer!);
    external?.removeEventListener('abort', onAbort!);
  }
}

export function parseTranslation(value: unknown): string {
  if (!value || typeof value !== 'object' || !('translatedText' in value) ||
      typeof value.translatedText !== 'string' || !value.translatedText.trim()) {
    throw new TypeError('Invalid translation response');
  }
  return value.translatedText.trim();
}
