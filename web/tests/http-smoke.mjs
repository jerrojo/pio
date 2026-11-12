import assert from "node:assert/strict";
const base = process.argv[2] || "http://127.0.0.1:3037";
const production = process.argv[3] === "production";
const checks = [];
async function check(name, path, options, expected) {
  const response = await fetch(base + path, {
    ...options,
    signal: AbortSignal.timeout(20000),
  });
  assert.equal(response.status, expected, name);
  checks.push({ name, status: response.status });
  return response;
}
await check("application loads", "/", {}, 200);
const status = await (
  await check("configuration state", "/api/status", {}, 200)
).json();
assert.equal(status.access, !production);
assert.deepEqual(status.ready, []);
await check(
  "cross origin rejected",
  "/api/turn",
  { method: "POST", headers: { origin: "https://untrusted.example" } },
  403,
);
await check(
  "voice without credentials stays unavailable",
  "/api/voice",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text: "Guten Morgen", locale: "de-DE" }),
  },
  production ? 401 : 503,
);
await check(
  "oversized voice input rejected",
  "/api/voice",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "a".repeat(5000),
  },
  production ? 401 : 413,
);
await check(
  "malformed turn rejected",
  "/api/turn",
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  },
  production ? 401 : 400,
);
await check(
  "invalid access code rejected",
  "/api/session",
  {
    method: "POST",
    headers: { origin: base, "Content-Type": "application/json" },
    body: JSON.stringify({ code: "invalid-test-code" }),
  },
  401,
);
await check(
  "layout harness only available in development",
  "/qa",
  {},
  production ? 404 : 200,
);
console.log(
  JSON.stringify(
    { mode: production ? "production" : "development", checks },
    null,
    2,
  ),
);
