// A squad of browser bots for Pío. Each worker drives its own headless Chrome
// through a share of the cases, with a fake microphone, a fake learner and
// scripted server replies (mock.js), and writes what it found.
//
// With the app running on port 3037 (npm run dev), from web/:
//   node --experimental-strip-types tests/bots/army.mjs <worker> <workers> [scenario,scenario]
// One worker runs everything: "0 1". Five in parallel: workers 0..4 of 5.
// Findings are printed at the end; details and screenshots go to a folder in
// the system's temporary directory. It needs Google Chrome (macOS path below).
import { spawn } from "node:child_process";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const web = join(here, "..", "..");
const { copyFor, languageIn, languageName, ownName } = await import(
  `${web}/lib/copy.ts`
);
const { locales, base } = await import(`${web}/lib/domain.ts`);
const worker = +process.argv[2] || 0,
  workers = +process.argv[3] || 1,
  filter = process.argv[4] || "";
const port = 9400 + worker;
const origin = "http://localhost:3037";
const out = join(tmpdir(), "pio-bots");
mkdirSync(out, { recursive: true });
const mock = readFileSync(join(here, "mock.js"), "utf8").replace(
  "__WAV__",
  readFileSync(join(here, "voice.wav")).toString("base64"),
);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Every plain string of each language, to spot text left in the wrong one.
const flat = (o, acc = []) => {
  for (const v of Object.values(o))
    if (typeof v === "string") acc.push(v);
    else if (v && typeof v === "object") flat(v, acc);
  return acc;
};
const strings = Object.fromEntries(
  ["es", "en", "de", "fr", "it", "pt"].map((l) => [l, flat(copyFor(l))]),
);

// ---- Chrome ---------------------------------------------------------------
const chrome = spawn(
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  [
    "--headless=new",
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${out}/profile-${worker}`,
    "--autoplay-policy=no-user-gesture-required",
    "--use-fake-ui-for-media-stream",
    "--no-first-run",
    "--hide-scrollbars",
    "--mute-audio",
    "about:blank",
  ],
  { stdio: "ignore" },
);
let ws;
for (let i = 0; i < 60 && !ws; i++) {
  await sleep(250);
  try {
    const tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json();
    const page = tabs.find((t) => t.type === "page");
    if (page) ws = new WebSocket(page.webSocketDebuggerUrl);
  } catch {}
}
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
let problems = []; // console errors and exceptions of the running case
ws.onmessage = (m) => {
  const d = JSON.parse(m.data);
  if (d.id && pending.has(d.id)) {
    pending.get(d.id)(d.result ?? { error: d.error });
    pending.delete(d.id);
  } else if (d.method === "Runtime.exceptionThrown")
    problems.push(
      "exception: " +
        (d.params.exceptionDetails.exception?.description ||
          d.params.exceptionDetails.text),
    );
  else if (d.method === "Runtime.consoleAPICalled" && d.params.type === "error")
    problems.push(
      "console: " +
        d.params.args.map((a) => a.value ?? a.description ?? "").join(" "),
    );
};
const send = (method, params = {}) =>
  new Promise((r) => {
    pending.set(++id, r);
    ws.send(JSON.stringify({ id, method, params }));
  });
await send("Runtime.enable");
await send("Page.enable");
const js = async (expression) => {
  const r = await send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  return r.result?.value;
};
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" });
  if (r.data)
    writeFileSync(join(out, name + ".png"), Buffer.from(r.data, "base64"));
};

// ---- The page under test ---------------------------------------------------
const findings = [];
let current = "";
const report = (kind, detail, step = "") => {
  findings.push({ case: current, step, kind, detail });
};
let script = null,
  screenW = 390,
  // On a phone held upright everything fits the screen: no scrolling.
  fits = false;
async function open(c, cfg, storage) {
  screenW = c.w;
  fits = c.w < 700 && c.h >= 640 && c.scenario !== "bigText";
  await send("Emulation.setDeviceMetricsOverride", {
    width: c.w,
    height: c.h,
    deviceScaleFactor: 1,
    mobile: c.w < 700,
  });
  if (script)
    await send("Page.removeScriptToEvaluateOnNewDocument", {
      identifier: script,
    });
  script = null;
  await send("Page.navigate", { url: origin + "/api/status" });
  for (let i = 0; i < 80; i++) {
    if (
      (await js(`location.origin`)) === origin &&
      (await js(`document.readyState`)) !== "loading"
    )
      break;
    await sleep(100);
  }
  await js(
    `localStorage.clear(); for (const [k,v] of Object.entries(${JSON.stringify(storage)})) localStorage.setItem(k, v)`,
  );
  script = (
    await send("Page.addScriptToEvaluateOnNewDocument", {
      source: mock.replace("__CFG__", JSON.stringify(cfg)),
    })
  ).identifier;
  problems = [];
  await send("Page.navigate", { url: origin + "/" });
  await until(`!!document.querySelector('.app-shell')`, 15000, "app loads");
  await sleep(500);
}
const prefs = (native, target) => ({
  "pio.preferences.v3": JSON.stringify({ version: 3, native, target }),
});
async function until(predicate, ms, what) {
  const end = Date.now() + ms;
  for (;;) {
    if (
      await js(`(()=>{try{return !!(${predicate})}catch(e){return false}})()`)
    )
      return true;
    if (Date.now() > end) {
      report("timeout", what + " | saw: " + (await state()), what);
      await shot(`${current.replace(/[^\w.-]+/g, "_")}--timeout`);
      return false;
    }
    await sleep(120);
  }
}
const state = () =>
  js(
    `[document.querySelector('#session-title')?.textContent, document.querySelector('.session-copy h1 + p')?.textContent, document.querySelector('.mic-button')?.className, document.querySelector('.phrase-card')?.className].join(' | ')`,
  );
const title = (text) =>
  `document.querySelector('#session-title')?.textContent === ${JSON.stringify(text)}`;
const describes = (text) =>
  `document.querySelector('.session-copy h1 + p')?.textContent === ${JSON.stringify(text)}`;
const click = (selector) =>
  js(
    `(()=>{const e=document.querySelector(${JSON.stringify(selector)}); if(!e) return false; e.click(); return true})()`,
  );
const clickText = (text) =>
  js(
    `(()=>{const e=[...document.querySelectorAll('button')].find(b=>b.textContent.trim()===${JSON.stringify(text)} && b.offsetParent); if(!e) return false; e.click(); return true})()`,
  );
const pick = (index, value) =>
  js(
    `(()=>{const e=[...document.querySelectorAll('select')].filter(s=>s.offsetParent)[${index}]; if(!e) return false; Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype,'value').set.call(e,${JSON.stringify(value)}); e.dispatchEvent(new Event('change',{bubbles:true})); return true})()`,
  );
const expect = async (ok, what, step) => {
  if (!ok) {
    report("assert", what + " | saw: " + (await state()), step);
    await shot(
      `${current.replace(/[^\w.-]+/g, "_")}--${String(step).replace(/[^\w.-]+/g, "_")}`,
    );
  }
  return ok;
};

// What must hold on every screen, whatever the state.
async function audit(step, native) {
  const lang = base(native);
  // SHOTS=1 keeps a picture of every audited screen, to look at the layout.
  if (process.env.SHOTS)
    await shot(`see-${screenW}-${current.split(" ")[0]}-${native}-${step}`);
  const found = await js(`(()=>{
    const out = [];
    // The real screen: a page that overflows makes the layout wider than it.
    const W = Math.min(innerWidth, visualViewport.width, ${screenW});
    const seen = (e) => { const r = e.getBoundingClientRect(), c = getComputedStyle(e); return r.width > 0 && r.height > 0 && c.visibility !== 'hidden' && c.display !== 'none' && +c.opacity > 0.05 && !e.closest('.sr-only') && !e.closest('[aria-hidden="true"]:not(.dock-label)') };
    const name = (e) => e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\\s+/).join('.') : '') + ' "' + (e.textContent || '').trim().slice(0, 40) + '"';
    if (document.documentElement.scrollWidth > W + 1) out.push(['overflow-x', 'page is ' + document.documentElement.scrollWidth + 'px wide in a ' + W + 'px screen']);
    if (${fits} && document.documentElement.scrollHeight > innerHeight + 1) out.push(['scroll-y', 'page is ' + document.documentElement.scrollHeight + 'px tall in a ' + innerHeight + 'px screen']);
    if (${fits}) for (const e of document.querySelectorAll('.conversation, .welcome, .phrase-card')) if (e.scrollHeight > e.clientHeight + 1) out.push(['inner-scroll', name(e).slice(0, 40) + ' holds ' + e.scrollHeight + 'px in ' + e.clientHeight + 'px']);
    for (const e of document.querySelectorAll('.app-shell *')) {
      if (!seen(e) || e.closest('.celebrate') || e.closest('.pio-orb') || e.closest('nextjs-portal')) continue;
      const r = e.getBoundingClientRect();
      if (r.right > W + 1 || r.left < -1) out.push(['off-screen', name(e) + ' x=' + Math.round(r.left) + '..' + Math.round(r.right)]);
      const c = getComputedStyle(e);
      if (e.children.length === 0 && e.scrollWidth > e.clientWidth + 1 && c.overflowX !== 'visible' && c.textOverflow !== 'ellipsis' ) out.push(['clipped', name(e)]);
    }
    for (const e of document.querySelectorAll('button, select, summary, input:not([type=hidden])')) {
      if (!seen(e) || e.closest('dialog:not([open])')) continue;
      const r = e.getBoundingClientRect();
      const box = e.matches('input[type=checkbox]') ? e.closest('label').getBoundingClientRect() : r;
      if (box.height < 43.5 || box.width < 43.5) out.push(['small-target', name(e) + ' ' + Math.round(box.width) + 'x' + Math.round(box.height)]);
      if (e.tagName === 'BUTTON' && !(e.textContent.trim() || e.getAttribute('aria-label'))) out.push(['unnamed-button', name(e)]);
    }
    const mic = document.querySelector('.mic-button');
    if (mic && seen(mic)) { const r = mic.getBoundingClientRect(); if (r.left < 0 || r.right > W) out.push(['mic-off-screen', Math.round(r.left) + '..' + Math.round(r.right)]); }
    for (const e of document.querySelectorAll('.app-shell h1, .app-shell p, .app-shell button, .app-shell label, .app-shell summary, .app-shell li, .app-shell h2, .app-shell span, .app-shell option')) {
      for (const n of e.childNodes) if (n.nodeType === 3 && n.textContent.trim()) {
        const t = n.textContent.trim();
        if (/undefined|\\[object|NaN|null/.test(t)) out.push(['broken-text', t.slice(0, 80)]);
      }
    }
    if (document.documentElement.lang !== ${JSON.stringify(native)}) out.push(['wrong-lang-attr', document.documentElement.lang]);
    const texts = [];
    const walk = document.createTreeWalker(document.querySelector('.app-shell'), NodeFilter.SHOW_TEXT);
    for (let n; (n = walk.nextNode()); ) { const t = n.textContent.trim(); if (t && n.parentElement.closest('[lang]') === document.documentElement.closest('[lang]') || (t && !n.parentElement.closest('.phrase-card p, .bubble p, option'))) texts.push(t); }
    return { out, texts };
  })()`);
  if (!found) return report("audit-failed", "could not inspect the page", step);
  for (const [kind, detail] of found.out) report(kind, detail, step);
  // Text of another interface language on screen (identical strings excluded).
  for (const other of Object.keys(strings)) {
    if (other === lang) continue;
    for (const t of found.texts)
      if (
        strings[other].includes(t) &&
        !strings[lang].includes(t) &&
        t.length > 3
      )
        report(
          "language-leak",
          `${other} text in a ${lang} screen: "${t}"`,
          step,
        );
  }
}

// ---- Scenarios -------------------------------------------------------------
const P = "Ich möchte einen Kaffee bestellen.";
const hasCard = (kind) => `!!document.querySelector('.phrase-card.${kind}')`;
const micIs = (phase) => `!!document.querySelector('.mic-button.${phase}')`;

const scenarios = {
  // Translate, miss one word, practise it, say the whole phrase.
  async happy(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { turns: ["translation", "practice", "ok", "ok"] },
      prefs(c.native, c.target),
    );
    await audit("idle", c.native);
    await click(".conversation .pio-orb");
    await sleep(400);
    await expect(
      (await js(`window.__cues`)) === 2,
      "tapping Pío makes it chirp: " + (await js(`window.__cues`)),
      "poke",
    );
    await expect(
      await js(`!!document.querySelector('.mic-button.idle')`),
      "tapping Pío does not start listening",
      "poke",
    );
    await expect(await js(title(t.session.ask)), "idle title", "idle");
    await click(".mic-button");
    if (!(await until(micIs("listening"), 8000, "listening starts"))) return;
    await audit("listening", c.native);
    await expect(
      await js(title(t.session.hearing)),
      "listening title",
      "listening",
    );
    await expect(
      (await js(`window.__cues`)) >= 1,
      "a sound says the microphone is open",
      "listening",
    );
    if (
      !(await until(
        hasCard("translation") + "&&" + micIs("speaking"),
        15000,
        "translation is spoken",
      ))
    )
      return;
    await sleep(900);
    await audit("translation", c.native);
    await expect(
      await js(title(t.session.howItSounds.title)),
      "speaking title",
      "translation",
    );
    await expect(
      (await js(`document.querySelector('.phrase-top').textContent.trim()`)) ===
        t.card.yourPhrase(languageIn(c.target, c.native)),
      "card label names the language",
      "translation",
    );
    await expect(
      (await js(
        `document.querySelectorAll('.phrase-card .word small').length`,
      )) === 5,
      "five meanings under five words",
      "translation",
    );
    if (
      !(await until(
        hasCard("practice") + "&&" + micIs("speaking"),
        20000,
        "practice word is spoken",
      ))
    )
      return;
    await sleep(600);
    await audit("drill", c.native);
    await expect(
      await js(`!document.querySelector('.phrase-top .score')`),
      "no score while one word is practised",
      "drill",
    );
    await expect(await js(title(t.session.parts)), "drill title", "drill");
    await expect(
      await js(`document.querySelector('mark.now')?.textContent === 'Kaffee'`),
      "word being practised is marked",
      "drill",
    );
    if (
      !(await until(
        title(t.session.wholeListen.title),
        20000,
        "whole phrase replay",
      ))
    )
      return;
    await audit("whole", c.native);
    if (!(await until(hasCard("accepted"), 25000, "phrase accepted"))) return;
    await expect(
      await until(
        `!!document.querySelector('.fly-star')`,
        1200,
        "a star flies to the count",
      ),
      "star effect",
      "accepted",
    );
    await sleep(700);
    await expect(
      (await js(`window.__cues`)) >= 12,
      "every step of the phrase had its sound: " + (await js(`window.__cues`)),
      "accepted",
    );
    await until(
      `!document.querySelector('.fly-star')`,
      2500,
      "the star lands and goes away",
    );
    await sleep(500);
    await audit("accepted", c.native);
    await expect(
      await js(title(t.session.accepted.title)),
      "accepted title",
      "accepted",
    );
    await expect(
      (await js(
        `document.querySelector('.chip.progress').textContent.trim()`,
      )) === "1",
      "one star earned",
      "accepted",
    );
    await expect(
      (await js(
        `document.querySelector('.phrase-top .score')?.textContent`,
      )) === "9/10",
      "the whole phrase gets its score out of ten",
      "accepted",
    );
    if (
      !(await until(
        `!document.querySelector('.phrase-card') && ${micIs("listening")}`,
        9000,
        "listens again after celebrating",
      ))
    )
      return;
    await click(".dock-actions .text-button");
    await until(micIs("idle"), 5000, "pause works");
    await audit("paused", c.native);
    await expect(await js(title(t.session.stopped)), "paused title", "paused");
    await send("Page.reload");
    await until(`!!document.querySelector('.chip.progress')`, 10000, "reload");
    await sleep(600);
    await expect(
      (await js(
        `document.querySelector('.chip.progress').textContent.trim()`,
      )) === "1",
      "star survives a reload",
      "reload",
    );
  },
  // Every failure the server can answer with, and that Pío recovers after it.
  async error(c) {
    const t = copyFor(c.native);
    const [spec, key] = c.arg;
    await open(c, { turns: [spec, "translation"] }, prefs(c.native, c.target));
    await click(".mic-button");
    if (!(await until(title(t.stumble), 20000, `error ${spec} is shown`)))
      return;
    const wanted = key === "failed" ? t.failed : t.errors[key];
    await expect(
      await js(describes(wanted)),
      `message for ${spec} is "${wanted}"`,
      spec,
    );
    await audit(spec, c.native);
    await expect(
      await js(micIs("idle")),
      "microphone is off after an error",
      spec,
    );
    // Recover: the retry button when there is one, else the microphone.
    const retried = (await clickText(t.retry)) || (await click(".mic-button"));
    await expect(retried, "something to tap to recover", spec);
    await until(hasCard("translation"), 25000, `recovers after ${spec}`);
    await expect(
      await js(`!document.querySelector('.connection-action')`),
      "retry button gone after recovery",
      spec,
    );
  },
  async micError(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { mic: c.arg, turns: ["translation"] },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (!(await until(title(t.stumble), 10000, `${c.arg} is shown`))) return;
    await expect(
      await js(describes(t.errors[c.arg])),
      `message for ${c.arg}`,
      c.arg,
    );
    await audit(c.arg, c.native);
    await js(`window.__cfg.mic = 'ok'`);
    await clickText(t.retry);
    await until(
      hasCard("translation"),
      20000,
      "recovers once the microphone works",
    );
  },
  async noSpeech(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { turns: ["nospeech", "nospeech"] },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (
      !(await until(
        title(t.session.missed),
        15000,
        "first miss says it did not hear",
      ))
    )
      return;
    await audit("missed", c.native);
    if (!(await until(title(t.session.waiting), 20000, "second miss rests")))
      return;
    await audit("resting", c.native);
    await expect(
      await js(micIs("idle")),
      "microphone off while resting",
      "resting",
    );
  },
  async silent(c) {
    const t = copyFor(c.native);
    await open(c, { silent: true }, prefs(c.native, c.target));
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening starts");
    await until(
      title(t.session.waiting) + "&&" + micIs("idle"),
      30000,
      "gives up on silence and rests",
    );
    const sent = await js(`window.__events.join(' ; ')`);
    await expect(
      !/turn/.test(sent),
      "silence is never sent to the server: " + sent,
      "silent",
    );
  },
  async voiceFail(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { voice: "fail", turns: ["translation", "ok"] },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (!(await until(title(t.stumble), 20000, "voice failure is shown")))
      return;
    await audit("voice-failed", c.native);
    await expect(
      await js(hasCard("translation")),
      "the phrase stays on screen without its voice",
      "voice-failed",
    );
    await expect(
      await js(
        `[...document.querySelectorAll('button')].some(b=>b.textContent.trim()===${JSON.stringify(t.listenAgain)})`,
      ),
      "offers to listen again",
      "voice-failed",
    );
    await js(`window.__cfg.voice = 'ok'`);
    await clickText(t.listenAgain);
    await until(micIs("speaking"), 10000, "voice plays on retry");
  },
  async gloss(c) {
    await open(
      c,
      { gloss: c.arg, turns: ["translation"], silent: true },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening");
    await js(`window.__say()`);
    if (!(await until(hasCard("translation"), 15000, "card"))) return;
    await sleep(c.arg === "slow" ? 4500 : 1800);
    const smalls = await js(
      `[...document.querySelectorAll('.phrase-card .word small')].map(s=>s.textContent.trim()).join(',')`,
    );
    if (c.arg === "ok" || c.arg === "slow")
      await expect(
        smalls === "m0,m1,m2,m3,m4",
        `meanings shown (${smalls})`,
        c.arg,
      );
    else
      await expect(
        smalls === "",
        `no meanings and no empty room left (${JSON.stringify(smalls)})`,
        c.arg,
      );
    await audit("gloss-" + c.arg, c.native);
  },
  async controls(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { turns: ["hang", "translation", "practice"], think: 300 },
      prefs(c.native, c.target),
    );
    // Pause while listening, then resume.
    await js(`window.__mute = true`);
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening");
    await clickText(t.pause);
    await expect(
      await until(
        title(t.session.stopped) + "&&" + micIs("idle"),
        4000,
        "pause while listening",
      ),
      "paused",
      "pause-listening",
    );
    await expect(
      (await js(`window.__events.filter(e=>e.startsWith('turn')).length`)) ===
        0,
      "pausing sends nothing",
      "pause-listening",
    );
    // Cancel while thinking.
    await js(`window.__mute = false`);
    await click(".mic-button");
    await until(micIs("thinking"), 15000, "thinking");
    await expect(
      (await js(`document.querySelector('.dock-label').textContent`)) ===
        t.mic.cancel,
      "button says cancel while thinking",
      "thinking",
    );
    await audit("thinking", c.native);
    await click(".mic-button");
    await expect(
      await until(
        micIs("idle") + "&&" + title(t.session.stopped),
        4000,
        "cancel while thinking",
      ),
      "cancelled",
      "cancel",
    );
    // Interrupt Pío's voice by tapping the microphone.
    await click(".mic-button");
    await until(micIs("speaking"), 20000, "speaking");
    await js(`window.__mute = true`);
    await click(".mic-button");
    await expect(
      await until(micIs("listening"), 5000, "interrupting the voice listens"),
      "interrupt",
      "interrupt",
    );
    // Slow switch.
    await click(".switch");
    await expect(
      await js(`document.querySelector('.switch').checked`),
      "slow switch turns on",
      "slow",
    );
    await until(micIs("speaking"), 8000, "slow replay starts");
    // Another phrase clears everything.
    await clickText(t.another);
    await expect(
      await until(
        `!document.querySelector('.phrase-card') && ${micIs("listening")}`,
        6000,
        "another phrase starts clean",
      ),
      "another",
      "another",
    );
    await audit("after-another", c.native);
  },
  async rapid(c) {
    await open(c, { turns: ["translation", "ok"] }, prefs(c.native, c.target));
    for (let i = 0; i < 14; i++) {
      await click(".mic-button");
      await sleep(40 + ((i * 37) % 180));
    }
    await sleep(6000);
    const cls = await js(`document.querySelector('.mic-button')?.className`);
    await expect(
      /idle|listening|thinking|speaking|waking|preparing-voice/.test(cls || ""),
      "a valid state after frantic tapping: " + cls,
      "rapid",
    );
    await audit("rapid", c.native);
    // And it still works.
    if (await js(micIs("idle"))) await click(".mic-button");
    await until(
      micIs("listening") + "||" + micIs("speaking") + "||" + micIs("thinking"),
      12000,
      "still alive after frantic tapping",
    );
  },
  async conversation(c) {
    const t = copyFor(c.native);
    await open(c, { turns: ["conversation"] }, prefs(c.native, c.target));
    await click(".mic-button");
    if (
      !(await until(
        `!!document.querySelector('.phrase-card.reply')`,
        15000,
        "Pío answers",
      ))
    )
      return;
    await sleep(800);
    await audit("conversation", c.native);
    await expect(
      await js(title(t.session.replies)),
      "conversation title",
      "conversation",
    );
    await expect(
      await js(
        describes(t.session.listenThenAnswer(languageIn(c.target, c.native))),
      ),
      "asks to answer in the language being learned",
      "conversation",
    );
    await expect(
      await js(
        `document.querySelector('.phrase-card .gloss')?.textContent === '(gloss)'`,
      ),
      "meaning of the reply shown",
      "conversation",
    );
    await until(micIs("listening"), 15000, "listens after answering");
    await expect(
      await js(describes(t.session.answerIn(languageIn(c.target, c.native)))),
      "listening copy in conversation",
      "conversation-listening",
    );
  },
  async drillPaths(c) {
    const t = copyFor(c.native);
    // Miss the word twice more (three tries), then it moves on; omission copy.
    await open(
      c,
      {
        turns: [
          "translation",
          "practice",
          "wordMiss",
          "wordMiss",
          "wordMiss",
          "practiceOmit",
          "ok",
          "ok",
        ],
        tip: "tip-text",
      },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (!(await until(title(t.session.parts), 30000, "drill starts"))) return;
    if (
      !(await until(
        title(t.session.again),
        20000,
        "word said again after a miss",
      ))
    )
      return;
    await sleep(400);
    await expect(
      await js(
        `document.querySelector('.session-copy h1 + p').textContent.includes('tip-text')`,
      ),
      "advice shown with the repeated word",
      "again",
    );
    await audit("again", c.native);
    if (
      !(await until(
        title(t.session.wholeListen.title),
        40000,
        "moves on after three misses",
      ))
    )
      return;
    if (
      !(await until(
        `[...document.querySelectorAll('.focus-words > span')].some(s=>s.textContent===${JSON.stringify(t.card.leftOut)})`,
        30000,
        "omission is named",
      ))
    )
      return;
    await audit("omission", c.native);
    await until(hasCard("accepted"), 40000, "ends accepted");
  },
  async manyMisses(c) {
    const t = copyFor(c.native);
    await open(
      c,
      {
        turns: [
          "translation",
          "practiceMany",
          "practiceMany",
          "practiceMany",
          "practiceMany",
        ],
      },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (
      !(await until(
        title(t.session.almost),
        30000,
        "first blank attempt replays the phrase",
      ))
    )
      return;
    await audit("almost", c.native);
    await until(
      title(t.session.parts),
      40000,
      "second blank attempt starts guided practice",
    );
    await audit("many-words", c.native);
  },
  async welcome(c) {
    await open(c, {}, {});
    if (
      !(await until(
        `!!document.querySelector('.welcome')`,
        8000,
        "welcome shows",
      ))
    )
      return;
    for (const native of c.arg) {
      const t = copyFor(native);
      await pick(0, native);
      await sleep(250);
      await expect(
        (await js(`document.querySelector('.welcome h1').textContent`)) ===
          `${t.welcome.hello} pío`,
        `greeting switches to ${native}`,
        native,
      );
      await expect(
        (await js(`document.querySelector('.setup-card h2').textContent`)) ===
          t.welcome.choose,
        `form title in ${native}`,
        native,
      );
      const own = await js(
        `[...document.querySelectorAll('select')[0].options].slice(1).map(o=>o.textContent).join('|')`,
      );
      await expect(
        own === locales.map(ownName).join("|"),
        "own-language names: " + own,
        native,
      );
      const theirs = await js(
        `[...document.querySelectorAll('select')[1].options].slice(1).map(o=>o.textContent + (o.disabled?'*':'')).join('|')`,
      );
      await expect(
        theirs ===
          locales
            .map(
              (l) =>
                languageName(l, native, true) +
                (base(l) === base(native) ? "*" : ""),
            )
            .join("|"),
        "practice names: " + theirs,
        native,
      );
      await expect(
        await js(`document.querySelector('.language-form .primary').disabled`),
        "cannot save without a language to practise",
        native,
      );
      await audit("welcome-" + native, native);
    }
    const native = c.arg.at(-1),
      target = locales.find((l) => base(l) !== base(native));
    await pick(1, target);
    await sleep(200);
    // Picking the same language as the one to practise empties that choice.
    await pick(0, target);
    await sleep(200);
    await expect(
      (await js(`document.querySelectorAll('select')[1].value`)) === "",
      "same language on both sides is undone",
      "same",
    );
    await pick(0, native);
    await pick(1, target);
    await sleep(200);
    await click(".language-form .primary");
    await until(
      `!!document.querySelector('.conversation')`,
      5000,
      "saving opens the practice screen",
    );
    await until(
      micIs("listening"),
      8000,
      "listens by itself after choosing languages",
    );
    await expect(
      await js(`window.__micOpen()`),
      "microphone open after choosing languages",
      "auto-listen",
    );
    await clickText(copyFor(native).pause);
    await sleep(300);
    await expect(
      (await js(`localStorage.getItem('pio.preferences.v3')`)) ===
        JSON.stringify({ version: 3, native, target }),
      "choice is saved",
      "save",
    );
    await audit("after-save", native);
    await send("Page.reload");
    await until(
      `!!document.querySelector('.conversation')`,
      10000,
      "choice survives a reload",
    );
    await sleep(400);
    await audit("after-reload", native);
  },
  async settings(c) {
    const t = copyFor(c.native),
      other = c.arg,
      o = copyFor(other);
    await open(
      c,
      { turns: ["translation", "translation"] },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (!(await until(hasCard("translation"), 15000, "card"))) return;
    await click(".language-pill");
    await until(`document.querySelector('dialog').open`, 3000, "dialog opens");
    await sleep(450);
    await expect(
      await js(micIs("idle")),
      "opening languages stops the session",
      "dialog",
    );
    await audit("dialog", c.native);
    await pick(0, other);
    await sleep(300);
    await expect(
      (await js(`document.querySelector('#settings-title').textContent`)) ===
        o.settings.title,
      "dialog switches language at once",
      "dialog-switch",
    );
    await expect(
      await js(title(o.session.stopped) + "||" + title(o.session.waiting)),
      "screen behind switches too",
      "dialog-switch",
    );
    await audit("dialog-switched", other);
    await click(".dialog-heading button");
    await sleep(300);
    await expect(
      await js(title(t.session.stopped) + "||" + title(t.session.waiting)),
      "closing without saving goes back",
      "dialog-cancel",
    );
    await expect(
      await js(hasCard("translation")),
      "phrase kept when nothing was saved",
      "dialog-cancel",
    );
    await audit("dialog-cancelled", c.native);
    // Escape closes it too.
    await click(".language-pill");
    await pick(0, other);
    await send("Input.dispatchKeyEvent", {
      type: "keyDown",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await send("Input.dispatchKeyEvent", {
      type: "keyUp",
      key: "Escape",
      code: "Escape",
      windowsVirtualKeyCode: 27,
    });
    await sleep(300);
    await expect(
      await js(`!document.querySelector('dialog').open`),
      "Escape closes the dialog",
      "escape",
    );
    await expect(
      await js(title(t.session.stopped) + "||" + title(t.session.waiting)),
      "Escape goes back too",
      "escape",
    );
    // Now save.
    await click(".language-pill");
    await pick(0, other);
    const target =
      (await js(`[...document.querySelectorAll('dialog select')][1].value`)) ||
      locales.find((l) => base(l) !== base(other));
    await pick(1, target);
    await sleep(200);
    await click("dialog .primary");
    await sleep(500);
    await expect(
      await until(
        micIs("listening") + "&&" + title(o.session.hearing),
        6000,
        "saving listens by itself, in the new language",
      ),
      "saving switches for good and listens by itself",
      "dialog-save",
    );
    await expect(
      await js(`!document.querySelector('.phrase-card')`),
      "old phrase gone after changing languages",
      "dialog-save",
    );
    await audit("dialog-saved", other);
    await until(hasCard("translation"), 15000, "works in the new language");
    await sleep(600);
    await audit("new-language-card", other);
  },
  async storage(c) {
    const [name, store, wants] = c.arg;
    await open(c, { turns: ["translation"] }, store);
    await sleep(600);
    const got = (await js(`!!document.querySelector('.welcome')`))
      ? "welcome"
      : "practice";
    await expect(
      got === wants,
      `${name}: shows ${got}, expected ${wants}`,
      name,
    );
    await audit(
      name,
      got === "welcome" ? await js(`document.documentElement.lang`) : c.native,
    );
    if (got === "practice") {
      await click(".mic-button");
      await until(hasCard("translation"), 15000, `${name}: still works`);
    }
  },
  async offline(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { status: "fail", turns: ["translation"] },
      prefs(c.native, c.target),
    );
    if (
      !(await until(
        title(t.connection.offline.title),
        12000,
        "offline is said",
      ))
    )
      return;
    await audit("offline", c.native);
    await expect(
      await js(`!document.querySelector('.mic-button')`),
      "no microphone while offline",
      "offline",
    );
    await js(`window.__cfg.status = 'ok'`);
    await clickText(t.retry);
    await until(
      title(t.session.ask),
      10000,
      "comes back when the connection does",
    );
  },
  async unconfigured(c) {
    const t = copyFor(c.native);
    await open(c, { ready: [] }, prefs(c.native, c.target));
    if (
      !(await until(
        title(t.connection.unconfigured.title),
        12000,
        "says it does not speak the language",
      ))
    )
      return;
    await audit("unconfigured", c.native);
    await expect(
      await clickText(t.changeLanguage),
      "offers to change language",
      "unconfigured",
    );
    await until(`document.querySelector('dialog').open`, 3000, "dialog opens");
  },
  async long(c) {
    const phrase = c.arg;
    await open(
      c,
      {
        phrase,
        longGloss: true,
        turns: ["translation", "practice"],
        weak: (phrase.split(/\s+/)[1] || phrase).replace(/[^\p{L}]/gu, ""),
      },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    if (!(await until(hasCard("translation"), 15000, "card"))) return;
    await sleep(1500);
    await audit("long-phrase", c.native);
    await shot(`long-${c.w}-${c.native}`);
    if (!/\s/.test(phrase.trim())) return;
    await until(hasCard("practice"), 30000, "practice");
    await sleep(800);
    await audit("long-practice", c.native);
  },
  async keyboard(c) {
    const t = copyFor(c.native);
    await open(c, { turns: ["translation"] }, prefs(c.native, c.target));
    const key = async (k, code, vk) => {
      await send("Input.dispatchKeyEvent", {
        type: "keyDown",
        key: k,
        code,
        windowsVirtualKeyCode: vk,
        ...(k === "Enter" ? { text: "\r" } : {}),
      });
      await send("Input.dispatchKeyEvent", {
        type: "keyUp",
        key: k,
        code,
        windowsVirtualKeyCode: vk,
      });
    };
    const seen = [];
    for (let i = 0; i < 8; i++) {
      await key("Tab", "Tab", 9);
      seen.push(
        await js(
          `(()=>{const e=document.activeElement; return e.className || e.tagName})()`,
        ),
      );
    }
    await expect(
      seen.some((s) => String(s).includes("mic-button")),
      "microphone reachable with the keyboard: " + seen.join(" > "),
      "tab",
    );
    await js(`document.querySelector('.mic-button').focus()`);
    await key("Enter", "Enter", 13);
    await until(
      micIs("listening") + "||" + micIs("permission") + "||" + micIs("waking"),
      5000,
      "Enter on the microphone starts listening",
    );
    await until(hasCard("translation"), 20000, "keyboard session works");
    await expect(
      await js(
        title(t.session.howItSounds.title) +
          "||" +
          title(t.session.nowYou.title) +
          "||" +
          title(t.session.hearing),
      ),
      "copy after keyboard start",
      "keyboard",
    );
  },
};

Object.assign(scenarios, {
  // The microphone must really be off whenever Pío is not in a session.
  async privacy(c) {
    const t = copyFor(c.native);
    const hide = (hidden) =>
      js(
        `(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>${hidden}});Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>'${hidden ? "hidden" : "visible"}'});document.dispatchEvent(new Event('visibilitychange'))})()`,
      );
    await open(
      c,
      { turns: ["translation", "translation", "translation", "translation"] },
      prefs(c.native, c.target),
    );
    await expect(
      !(await js(`window.__micOpen()`)),
      "microphone closed before the first tap",
      "start",
    );
    await js(`window.__mute = true`);
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening");
    await expect(
      await js(`window.__micOpen()`),
      "microphone open while listening",
      "listening",
    );
    await clickText(t.pause);
    await sleep(300);
    await expect(
      !(await js(`window.__micOpen()`)),
      "Pause closes the microphone",
      "pause",
    );
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening again");
    await hide(true);
    await sleep(300);
    await expect(
      await js(micIs("idle")),
      "leaving the tab stops the session",
      "hidden",
    );
    await expect(
      !(await js(`window.__micOpen()`)),
      "leaving the tab closes the microphone",
      "hidden",
    );
    await hide(false);
    await sleep(300);
    await expect(
      (await js(micIs("idle"))) && !(await js(`window.__micOpen()`)),
      "coming back does not listen by itself",
      "visible",
    );
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening third time");
    await click(".language-pill");
    await sleep(300);
    await expect(
      !(await js(`window.__micOpen()`)),
      "opening languages closes the microphone",
      "dialog",
    );
    await click(".dialog-heading button");
    // While Pío speaks, leaving the tab stops its voice too.
    await js(`window.__mute = false`);
    await click(".mic-button");
    await until(micIs("speaking"), 20000, "speaking");
    await hide(true);
    await sleep(300);
    await expect(
      await js(micIs("idle")),
      "leaving the tab stops the voice",
      "hidden-speaking",
    );
    await expect(
      !(await js(`window.__micOpen()`)),
      "microphone closed after leaving while Pío spoke",
      "hidden-speaking",
    );
    await hide(false);
    // Resting after silence closes it as well.
    await js(`window.__mute = true`);
    await click(".mic-button");
    await until(
      micIs("listening") + "||" + micIs("speaking"),
      8000,
      "session resumes",
    );
    await until(micIs("listening"), 15000, "listening before resting");
    await until(
      micIs("idle") + "&&" + title(t.session.waiting),
      30000,
      "rests after silence",
    );
    await expect(
      !(await js(`window.__micOpen()`)),
      "resting closes the microphone",
      "rest",
    );
  },
  async micLost(c) {
    const t = copyFor(c.native);
    await open(c, { turns: ["translation"] }, prefs(c.native, c.target));
    await js(`window.__mute = true`);
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening");
    await js(
      `(()=>{const tr=window.__streams.at(-1).getAudioTracks()[0]; tr.stop(); tr.dispatchEvent(new Event('ended'))})()`,
    );
    await until(micIs("idle"), 6000, "losing the microphone stops listening");
    await audit("mic-lost", c.native);
    await expect(
      !(await js(title(t.session.hearing))),
      "does not claim to listen after losing the microphone",
      "mic-lost",
    );
    await js(`window.__mute = false`);
    (await clickText(t.retry)) || (await click(".mic-button"));
    if (
      !(await until(
        hasCard("translation"),
        20000,
        "works again after losing the microphone",
      ))
    )
      report(
        "info",
        await js(
          `window.__events.join(' ; ') + ' | tracks ' + window.__streams.map(s=>s.getAudioTracks()[0].readyState).join(',')`,
        ),
      );
  },
  async noStorage(c) {
    await open(c, { noStorage: true, turns: ["translation", "ok"] }, {});
    await until(`!!document.querySelector('.welcome')`, 8000, "welcome");
    await pick(0, c.native);
    await pick(1, c.target);
    await sleep(200);
    await click(".language-form .primary");
    await until(
      `!!document.querySelector('.conversation')`,
      5000,
      "works without storage",
    );
    await expect(
      (await js(`document.querySelector('.notice')?.textContent`)) ===
        copyFor(c.native).saveFailed,
      "says it could not save the languages",
      "notice",
    );
    await audit("no-storage", c.native);
    // Saving the languages starts the session by itself.
    await until(
      hasCard("accepted"),
      40000,
      "a whole phrase works without storage",
    );
  },
  async bigText(c) {
    const t = copyFor(c.native);
    await open(
      c,
      { bigText: c.arg, turns: ["translation", "practice", "ok", "ok"] },
      prefs(c.native, c.target),
    );
    await audit("big-idle", c.native);
    await click(".mic-button");
    await until(hasCard("translation"), 15000, "card");
    await sleep(1200);
    await audit("big-card", c.native);
    await shot(`big-${c.arg}-${c.native}-${c.w}`);
    await until(title(t.session.parts), 25000, "drill");
    await audit("big-drill", c.native);
    await click(".language-pill");
    await sleep(300);
    await audit("big-dialog", c.native);
  },
  async slow(c) {
    const t = copyFor(c.native);
    await open(
      c,
      {
        think: 7000,
        voice: "slow",
        gloss: "slow",
        turns: ["translation", "ok"],
      },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    await until(micIs("thinking"), 12000, "thinking");
    await sleep(3000);
    await expect(
      await js(title(t.session.thinking.title)),
      "still says it is thinking after a few seconds",
      "slow",
    );
    await audit("slow-thinking", c.native);
    await until(hasCard("translation"), 15000, "slow answer arrives");
    await until(hasCard("accepted"), 40000, "slow session completes");
  },
});

Object.assign(scenarios, {
  // A word of a fifth of a second ("sí", "ja") must still be taken as a turn,
  // and without waiting out the long silence limit.
  async shortWord(c) {
    await open(
      c,
      { blip: c.arg[0], level: c.arg[1], turns: ["translation"] },
      prefs(c.native, c.target),
    );
    await click(".mic-button");
    await until(micIs("listening"), 8000, "listening");
    const from = Date.now();
    if (
      !(await until(
        `window.__events.some(e=>e.startsWith('turn'))`,
        7000,
        `a word of ${c.arg[0]} s at level ${c.arg[1]} is sent to be understood`,
      ))
    )
      return;
    await expect(
      Date.now() - from < 5000,
      "sent soon after the word, not after the long wait",
      "short-word",
    );
    await until(hasCard("translation"), 15000, "and answered");
  },
});

Object.assign(scenarios, {
  // The third phrase ever said well is celebrated once, the iPhone app is
  // asked for a rating, and nothing listens until the learner goes on.
  async milestone(c) {
    const t = copyFor(c.native);
    const pair = `${c.native}:${c.target}`;
    const before = JSON.stringify([
      { id: "a", pair, phrase: "guten morgen", day: "2026-11-20" },
      { id: "b", pair, phrase: "danke schon", day: "2026-11-21" },
    ]);
    await open(
      c,
      { app: true, turns: ["translation", "ok", "translation", "ok"] },
      { ...prefs(c.native, c.target), "pio.mastery.v3": before },
    );
    await click(".mic-button");
    if (!(await until(hasCard("accepted"), 40000, "third phrase accepted")))
      return;
    await expect(
      await until(title(t.milestone.title), 3000, "the milestone is announced"),
      "milestone title",
      "milestone",
    );
    await audit("milestone", c.native);
    await sleep(2500);
    await expect(
      await js(`window.__asked.some(m => m && m.review)`),
      "the iPhone app is asked for a rating",
      "milestone",
    );
    await expect(
      (await js(`window.__asked.filter(m => m && m.review).length`)) === 1,
      "asked exactly once",
      "milestone",
    );
    await sleep(3000);
    await expect(
      await js(micIs("idle") + "&&" + title(t.milestone.title)),
      "nothing listens until the learner goes on",
      "milestone",
    );
    await expect(
      !(await js(`window.__micOpen()`)),
      "microphone closed during the milestone",
      "milestone",
    );
    // Going on works, and the next phrase is an ordinary one.
    await click(".mic-button");
    if (
      !(await until(
        hasCard("accepted") + "&&" + title(t.session.accepted.title),
        50000,
        "fourth phrase is an ordinary success",
      ))
    )
      return;
    await sleep(3000);
    await expect(
      (await js(`window.__asked.filter(m => m && m.review).length`)) === 1,
      "never asked a second time",
      "after",
    );
  },
});

Object.assign(scenarios, {
  // A first visit reads in the device's language, and in English when pío
  // does not speak it.
  async firstLanguage(c) {
    const [languages, wanted] = c.arg;
    const t = copyFor(wanted);
    await open(c, { languages }, {});
    if (
      !(await until(
        `!!document.querySelector('.welcome')`,
        8000,
        "welcome shows",
      ))
    )
      return;
    await sleep(300);
    await expect(
      (await js(`document.querySelector('.welcome h1').textContent`)) ===
        `${t.welcome.hello} pío`,
      `a ${languages[0]} device starts in ${wanted}`,
      languages[0],
    );
    await expect(
      (await js(
        `document.querySelector('.language-form .primary').textContent.trim()`,
      )) === t.form.save,
      "the form is in that language too",
      languages[0],
    );
    await audit("first-" + languages[0], wanted);
  },
});

// ---- The cases ---------------------------------------------------------------
const targetFor = (native) => (base(native) === "de" ? "en-US" : "de-DE");
// A phone's screen less the bars the app keeps clear of (notch, home bar).
const phone = { w: 393, h: 756 },
  small = { w: 320, h: 568 },
  short = { w: 375, h: 650 },
  wide = { w: 1280, h: 800 },
  tablet = { w: 768, h: 1024 },
  land = { w: 844, h: 390 };
const cases = [];
const add = (scenario, native, size, arg, target) =>
  cases.push({
    scenario,
    native,
    target: target || targetFor(native),
    ...size,
    arg,
  });
for (const n of locales) add("happy", n, phone);
for (const n of ["de-DE", "fr-FR", "pt-BR", "it-IT"]) add("happy", n, small);
add("happy", "en-US", wide);
add("happy", "es-MX", short);
add("happy", "de-DE", land);
add("happy", "fr-FR", tablet);
const errors = [
  ["err:provider-busy:503", "provider-busy"],
  ["err:provider-quota:503", "provider-quota"],
  ["err:provider-timeout:504", "provider-timeout"],
  ["err:too-many-requests:429", "too-many-requests"],
  ["err:none:429", "too-many-requests"],
  ["err:none:403", "too-many-requests"],
  ["err:assessment-incomplete:422", "assessment-incomplete"],
  ["err:assessment-unavailable:422", "assessment-unavailable"],
  ["err:invalid-audio:400", "invalid-audio"],
  ["err:phrase-too-long:413", "phrase-too-long"],
  ["err:not-configured:503", "not-configured"],
  ["err:something-new:500", "failed"],
  ["err:none:500", "failed"],
  ["html500", "failed"],
  ["garbage", "failed"],
  ["net", "TypeError"],
];
errors.forEach((e, i) =>
  add("error", locales[i % locales.length], i % 3 === 0 ? small : phone, e),
);
["NotAllowedError", "NotFoundError", "NotReadableError"].forEach((e, i) =>
  add("micError", ["de-DE", "en-US", "it-IT"][i], phone, e),
);
for (const n of ["es-MX", "de-DE", "fr-FR"]) add("noSpeech", n, phone);
for (const n of ["pt-BR", "en-US"]) add("silent", n, phone);
for (const n of ["de-DE", "es-MX", "it-IT"])
  add("voiceFail", n, n === "de-DE" ? small : phone);
for (const g of ["ok", "slow", "fail", "net", "wrongcount"])
  add("gloss", "es-MX", phone, g);
for (const n of ["es-MX", "de-DE", "fr-FR", "en-US"])
  add("controls", n, n === "de-DE" ? small : phone);
for (const n of ["es-MX", "pt-BR"]) add("rapid", n, phone);
for (const n of locales.filter((_, i) => i % 2 === 0))
  add("conversation", n, phone);
for (const n of ["es-MX", "de-DE", "it-IT"])
  add("drillPaths", n, n === "de-DE" ? small : phone);
for (const n of ["fr-FR", "en-US"]) add("manyMisses", n, phone);
add("welcome", "es-MX", phone, [...locales]);
add("welcome", "es-MX", short, [...locales]);
for (const n of locales) add("happy", n, short);
for (const n of ["de-DE", "fr-FR"]) add("drillPaths", n, short);
for (const n of ["de-DE", "pt-BR"]) add("milestone", n, short);
add("manyMisses", "de-DE", short);
add("conversation", "it-IT", short);
add("welcome", "es-MX", small, ["de-DE", "fr-FR", "pt-BR", "en-US", "it-IT"]);
add("welcome", "es-MX", wide, ["en-US", "es-MX"]);
[
  ["es-MX", "de-DE"],
  ["de-DE", "fr-FR"],
  ["en-US", "pt-BR"],
  ["it-IT", "es-MX"],
  ["fr-FR", "en-US"],
].forEach(([a, b], i) => add("settings", a, i % 2 ? small : phone, b));
const good = { version: 3, native: "es-MX", target: "de-DE" };
[
  ["broken-json", { "pio.preferences.v3": "{not json" }, "welcome"],
  [
    "same-language",
    {
      "pio.preferences.v3": JSON.stringify({
        version: 3,
        native: "es-MX",
        target: "es-MX",
      }),
    },
    "welcome",
  ],
  [
    "old-version",
    {
      "pio.preferences.v3": JSON.stringify({
        version: 2,
        native: "es-MX",
        target: "de-DE",
      }),
    },
    "welcome",
  ],
  [
    "unknown-language",
    {
      "pio.preferences.v3": JSON.stringify({
        version: 3,
        native: "es-MX",
        target: "ja-JP",
      }),
    },
    "welcome",
  ],
  [
    "garbage-progress",
    {
      "pio.preferences.v3": JSON.stringify(good),
      "pio.mastery.v3": "[[[",
      "pio.status.v1": "42",
      "pio.review.v1": '{"a":1}',
    },
    "practice",
  ],
  [
    "huge-progress",
    {
      "pio.preferences.v3": JSON.stringify(good),
      "pio.mastery.v3": JSON.stringify(
        Array.from({ length: 3000 }, (_, i) => ({
          text: "x" + i,
          at: Date.now(),
        })),
      ),
    },
    "practice",
  ],
  [
    "null-values",
    {
      "pio.preferences.v3": JSON.stringify(good),
      "pio.mastery.v3": "null",
      "pio.status.v1": "null",
    },
    "practice",
  ],
].forEach((a) => add("storage", "es-MX", phone, a));
for (const n of ["es-MX", "de-DE"]) add("offline", n, phone);
for (const n of ["fr-FR", "pt-BR"]) add("unconfigured", n, phone);
const longs = [
  "Könnten Sie mir bitte freundlicherweise sagen, wo sich die nächste Straßenbahnhaltestelle befindet, denn ich habe mich leider verlaufen?",
  "Donaudampfschifffahrtsgesellschaftskapitän Rindfleischetikettierungsüberwachungsaufgabenübertragungsgesetz bitte.",
  "Ja.",
];
longs.forEach((p, i) => {
  add("long", "es-MX", small, p);
  add("long", "de-DE", i ? phone : wide, p);
});
for (const n of ["es-MX", "en-US"]) add("keyboard", n, wide);

for (const n of ["es-MX", "de-DE", "en-US"]) add("privacy", n, phone);
for (const n of ["es-MX", "fr-FR"]) add("micLost", n, phone);
for (const [n, size, pct] of [
  ["es-MX", phone, 150],
  ["de-DE", phone, 150],
  ["fr-FR", small, 130],
  ["pt-BR", phone, 200],
  ["en-US", wide, 200],
])
  add("bigText", n, size, pct);
for (const n of ["es-MX", "de-DE"]) add("slow", n, phone);
// Last: it disables storage for the rest of that browser's run.
for (const n of ["es-MX", "it-IT"]) add("noStorage", n, phone);

// Length in seconds and loudness. The last two are the ones the detector
// used to miss: under a tenth of a second and soft.
for (const pair of [
  [0.2, 0.25],
  [0.12, 0.25],
  [0.2, 0.06],
  [0.1, 0.06],
  [0.08, 0.04],
  [0.06, 0.04],
])
  add("shortWord", "es-MX", phone, pair);

for (const n of ["es-MX", "en-US", "de-DE"])
  add("milestone", n, n === "de-DE" ? small : phone);

for (const pair of [
  [["ja-JP"], "en-US"],
  [["ko-KR", "zh-CN"], "en-US"],
  [["es-AR"], "es-MX"],
  [["en-GB"], "en-US"],
  [["pt-PT"], "pt-BR"],
  [["de-AT"], "de-DE"],
  [["ja-JP", "fr-CA"], "fr-FR"],
])
  add("firstLanguage", "en-US", phone, pair);

// ---- Run -----------------------------------------------------------------------
const wanted = filter.split(",").filter(Boolean);
const mine = cases
  .filter((c) => !wanted.length || wanted.includes(c.scenario))
  .filter((_, i) => i % workers === worker);
const summary = [];
for (const c of mine) {
  current = `${c.scenario} ${c.native}>${c.target} ${c.w}x${c.h}${c.arg ? " " + (Array.isArray(c.arg) ? c.arg[0] : String(c.arg).slice(0, 24)) : ""}`;
  const before = findings.length,
    started = Date.now();
  try {
    await Promise.race([
      scenarios[c.scenario](c),
      sleep(150000).then(() => {
        throw new Error("case took more than 150 s");
      }),
    ]);
  } catch (error) {
    report("crash", String(error?.stack || error).slice(0, 400));
  }
  const expected = /vibrate|503|Failed to load resource|favicon/;
  for (const p of [...new Set(problems)])
    if (!expected.test(p)) report("browser-error", p.slice(0, 300));
  summary.push(
    `${findings.length === before ? "ok  " : "FAIL"} ${((Date.now() - started) / 1000).toFixed(0).padStart(3)}s ${current}`,
  );
  writeFileSync(
    join(out, `findings-${worker}.json`),
    JSON.stringify({ findings, summary }, null, 1),
  );
}
ws.close();
chrome.kill();
console.log(summary.join("\n"));
for (const f of findings)
  console.log(`  ${f.case} | ${f.step} | ${f.kind} | ${f.detail}`);
console.log(
  `${summary.length} cases, ${findings.length} findings. Details: ${out}`,
);
