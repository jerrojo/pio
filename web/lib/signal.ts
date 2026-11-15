// A signal that aborts after `ms` or when any of the given signals does.
// AbortSignal.any and AbortSignal.timeout are missing on iPhones before
// iOS 17.4, where using them directly would stop Pío from loading at all.
export function anySignal(ms: number, ...signals: (AbortSignal | undefined)[]) {
  const control = new AbortController();
  const stop = (reason?: unknown) => {
    clearTimeout(timer);
    if (!control.signal.aborted) control.abort(reason);
  };
  const timer = setTimeout(
    () => stop(new DOMException("Timed out", "TimeoutError")),
    ms,
  );
  for (const signal of signals) {
    if (!signal) continue;
    if (signal.aborted) stop(signal.reason);
    else
      signal.addEventListener("abort", () => stop(signal.reason), {
        once: true,
      });
  }
  control.signal.addEventListener("abort", () => clearTimeout(timer), {
    once: true,
  });
  return control.signal;
}
