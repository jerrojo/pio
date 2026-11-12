import { test } from "node:test";
import assert from "node:assert/strict";
import {
  allow,
  authorized,
  equalSecret,
  errorResponse,
  guard,
  newSession,
  readLimited,
  sameOrigin,
} from "../lib/security.ts";
test("same-origin accepts the browser destination despite Next internal hostname", () => {
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3037/api/session", {
        headers: { host: "127.0.0.1:3037", origin: "http://127.0.0.1:3037" },
      }),
    ),
    true,
  );
  assert.equal(
    sameOrigin(
      new Request("http://localhost:3037/api/session", {
        headers: {
          host: "127.0.0.1:3037",
          origin: "https://evil.test",
          "x-forwarded-host": "evil.test",
        },
      }),
    ),
    false,
  );
  assert.equal(
    sameOrigin(
      new Request("https://pio.test/api/session", {
        headers: { host: "pio.test", origin: "http://pio.test" },
      }),
    ),
    false,
  );
});
test("private session requires a valid signature and expiry", () => {
  const previous = process.env.PIO_ACCESS_CODE;
  process.env.PIO_ACCESS_CODE = "local-test-only-do-not-use";
  try {
    const cookie = newSession();
    assert.equal(
      authorized(
        new Request("https://pio.test", {
          headers: { cookie: `pio_session=${cookie}` },
        }),
      ),
      true,
    );
    assert.equal(
      authorized(
        new Request("https://pio.test", {
          headers: { cookie: `pio_session=${cookie}broken` },
        }),
      ),
      false,
    );
    assert.equal(
      authorized(
        new Request("https://pio.test", {
          headers: { cookie: "pio_session=1.fake.invalid" },
        }),
      ),
      false,
    );
    assert.equal(authorized(new Request("https://pio.test")), false);
  } finally {
    if (previous === undefined) delete process.env.PIO_ACCESS_CODE;
    else process.env.PIO_ACCESS_CODE = previous;
  }
});
test("production without configured access code stays closed", () => {
  const mode = process.env.NODE_ENV,
    code = process.env.PIO_ACCESS_CODE;
  try {
    Object.assign(process.env, { NODE_ENV: "production" });
    delete process.env.PIO_ACCESS_CODE;
    assert.equal(authorized(new Request("https://pio.test")), false);
  } finally {
    Object.assign(process.env, { NODE_ENV: mode });
    if (code !== undefined) process.env.PIO_ACCESS_CODE = code;
  }
});
test("cross-origin invocation is rejected before using a provider", () =>
  assert.equal(
    guard(
      new Request("https://pio.test/api/turn", {
        headers: { origin: "https://other.test" },
      }),
    )?.status,
    403,
  ));
test("limiter rejects over-budget requests", () => {
  const key = crypto.randomUUID();
  assert.equal(allow(key, 2), true);
  assert.equal(allow(key, 2), true);
  assert.equal(allow(key, 2), false);
});
test("secret comparison does not accept a prefix", () => {
  assert.equal(equalSecret("test", "test"), true);
  assert.equal(equalSecret("test", "test-more"), false);
});
test("provider internals and credentials never appear in error response", async () => {
  const response = errorResponse(
    new Error("private diagnostic that must not be returned"),
  );
  assert.deepEqual(await response.json(), { code: "service-unavailable" });
});
test("body limit works without Content-Length", async () => {
  const r = new Request("https://pio.test", {
    method: "POST",
    body: "a".repeat(100),
  });
  await assert.rejects(() => readLimited(r, 99), /input-too-large/);
});
test("body limit accepts exact boundary", async () => {
  const r = new Request("https://pio.test", { method: "POST", body: "hello" });
  assert.equal(new TextDecoder().decode(await readLimited(r, 5)), "hello");
});
