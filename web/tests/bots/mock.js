// Test double injected before the app loads: a fake microphone, a fake
// learner, and scripted server replies chosen by window.__cfg.
(() => {
  const cfg = (window.__cfg = __CFG__);
  const wav = Uint8Array.from(atob("__WAV__"), (c) => c.charCodeAt(0));
  const AC = window.AudioContext;
  let ctx = null,
    dest = null;
  const audio = () => ctx || (ctx = new AC());
  window.__events = [];
  // Tones the page itself plays (the fake microphone's own are not counted).
  window.__cues = 0;
  const begin = OscillatorNode.prototype.start;
  OscillatorNode.prototype.start = function (...args) {
    if (this.context !== ctx) window.__cues++;
    return begin.apply(this, args);
  };
  const note = (x) => window.__events.push(x);
  navigator.mediaDevices.getUserMedia = async () => {
    note("gum");
    if (cfg.mic && cfg.mic !== "ok") throw new DOMException("mock", cfg.mic);
    await audio().resume();
    dest = audio().createMediaStreamDestination();
    const g = audio().createGain();
    g.gain.value = 0.00001;
    const o = audio().createOscillator();
    o.connect(g);
    g.connect(dest);
    o.start();
    (window.__streams ||= []).push(dest.stream);
    return dest.stream;
  };
  window.__micOpen = () =>
    (window.__streams || []).some((s) =>
      s.getAudioTracks().some((t) => t.readyState === "live"),
    );
  if (cfg.noStorage) {
    const deny = () => {
      throw new DOMException("denied", "SecurityError");
    };
    Storage.prototype.setItem = deny;
  }
  if (cfg.bigText)
    addEventListener("DOMContentLoaded", () => {
      const st = document.createElement("style");
      st.textContent = "html{font-size:" + cfg.bigText + "%}";
      document.head.appendChild(st);
    });
  window.__say = async () => {
    const b = await audio().decodeAudioData(wav.buffer.slice(0));
    const s = audio().createBufferSource();
    s.buffer = b;
    s.connect(dest);
    s.start();
  };
  const P = cfg.phrase || "Ich möchte einen Kaffee bestellen.";
  const bare = (w) => w.replace(/[^\p{L}\p{N}'-]/gu, "");
  const words = P.split(/\s+/).map(bare);
  const weakWord = cfg.weak || words[Math.min(3, words.length - 1)];
  const W = (t, a, e = "None") => ({ text: t, accuracy: a, error: e });
  const ev = (ws, turn, ref) => ({
    source: "scribe-clarity",
    audioId: turn.id,
    referenceId: ref ? ref.id : null,
    locale: turn.preferences.target,
    mode: "scripted",
    text: ws.map((w) => w.text).join(" "),
    accuracy: 90,
    completeness: 100,
    words: ws,
  });
  const make = (spec, turn) => {
    const locale = turn.preferences.target,
      ref = turn.reference;
    const base = {
      id: turn.id,
      heard: "",
      text: "",
      reference: ref,
      evidence: null,
      focus: [],
    };
    if (spec === "translation") {
      const r = { id: crypto.randomUUID(), text: P, locale };
      return {
        ...base,
        outcome: "translation",
        heard: cfg.heard || "Quiero pedir un café, por favor.",
        text: P,
        reference: r,
        voice: "proof",
      };
    }
    if (spec === "conversation") {
      const text = "Hallo! Wie geht es dir heute?";
      return {
        ...base,
        outcome: "conversation",
        heard: "Hallo",
        text,
        reference: { id: crypto.randomUUID(), text, locale },
        gloss: "(gloss)",
        voice: "proof",
      };
    }
    if (spec === "nospeech") return { ...base, outcome: "no-speech" };
    if (spec === "unavailable") return { ...base, outcome: "unavailable" };
    const single = ref && !/\s/.test(ref.text.trim()) && ref.text !== P;
    if (spec === "ok") {
      const ws = (single ? [bare(ref.text)] : words).map((w) => W(w, 92));
      return {
        ...base,
        outcome: "accepted",
        heard: single ? ref.text : P,
        text: ref ? ref.text : P,
        evidence: ev(ws, turn, ref),
      };
    }
    if (spec === "practice") {
      const ws = words.map((w) =>
        w === weakWord ? W(w, 30, "Mispronunciation") : W(w, 90),
      );
      return {
        ...base,
        outcome: "practice",
        heard: "Ich mochte einen Cafe bestellen",
        text: P,
        evidence: ev(ws, turn, ref),
        focus: [weakWord],
        weak: [weakWord],
      };
    }
    if (spec === "practiceMany") {
      const ws = words.map((w) => W(w, 20, "Mispronunciation"));
      return {
        ...base,
        outcome: "practice",
        heard: "mm",
        text: P,
        evidence: ev(ws, turn, ref),
        focus: words.slice(0, 3),
        weak: words,
      };
    }
    if (spec === "practiceOmit") {
      const ws = words.map((w, i) =>
        i === words.length - 1 ? W(w, 0, "Omission") : W(w, 90),
      );
      return {
        ...base,
        outcome: "practice",
        heard: words.slice(0, -1).join(" "),
        text: P,
        evidence: ev(ws, turn, ref),
        focus: [words.at(-1)],
        weak: [words.at(-1)],
      };
    }
    if (spec === "wordMiss")
      return {
        ...base,
        outcome: "practice",
        heard: "Cafe",
        text: ref.text,
        evidence: ev([W(bare(ref.text), 30, "Mispronunciation")], turn, ref),
        focus: [ref.text],
        weak: [ref.text],
        tip: cfg.tip || "(tip)",
      };
    return { ...base, outcome: "no-speech" };
  };
  window.__queue = [...(cfg.turns || [])];
  const real = window.fetch.bind(window);
  const json = (body, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" },
    });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  let statusCalls = 0;
  window.fetch = async (u, o = {}) => {
    const url = String(u);
    if (url.includes("/api/status")) {
      statusCalls++;
      if (
        cfg.status === "fail" ||
        (cfg.status === "failOnce" && statusCalls === 1)
      )
        throw new TypeError("Failed to fetch");
      return json({
        access: true,
        canSignIn: false,
        ready: cfg.ready || [
          "es-MX",
          "es-MX",
          "en-US",
          "en-US",
          "de-DE",
          "fr-FR",
          "it-IT",
          "pt-BR",
          "pt-BR",
        ],
      });
    }
    if (url.includes("/api/ear")) return new Response("{}", { status: 503 });
    if (url.includes("/api/voice")) {
      note("voice");
      if (cfg.voice === "fail") return json({ code: "provider-busy" }, 503);
      if (cfg.voice === "slow") await wait(2500);
      return new Response(wav.slice(0), {
        headers: { "content-type": "audio/wav" },
      });
    }
    if (url.includes("/api/gloss")) {
      note("gloss");
      const text = JSON.parse(o.body).text,
        n = text.trim().split(/\s+/).length;
      await wait(cfg.gloss === "slow" ? 3000 : 400);
      if (cfg.gloss === "fail") return json({ code: "provider-busy" }, 503);
      if (cfg.gloss === "net") throw new TypeError("Failed to fetch");
      const out = Array.from(
        { length: cfg.gloss === "wrongcount" ? n + 1 : n },
        (_, i) =>
          cfg.meanings
            ? cfg.meanings[i]
            : cfg.longGloss
              ? "significadolargo" + i
              : "m" + i,
      );
      return json({ words: out });
    }
    if (url.includes("/api/turn")) {
      if (o.method !== "POST") return new Response("", { status: 200 });
      const turn = JSON.parse(o.body.get("turn"));
      window.__lastTurn = turn;
      note(
        "turn:" +
          turn.intent +
          ":" +
          (turn.reference ? turn.reference.text : "-"),
      );
      const spec = window.__queue.length ? window.__queue.shift() : "nospeech";
      await wait(cfg.think || 500);
      if (spec === "net") throw new TypeError("Failed to fetch");
      if (spec === "hang")
        return new Promise(
          (_, rej) =>
            o.signal &&
            o.signal.addEventListener("abort", () =>
              rej(new DOMException("aborted", "AbortError")),
            ),
        );
      if (spec === "garbage")
        return new Response("<<not json>>", {
          headers: { "content-type": "application/json" },
        });
      if (spec === "html500")
        return new Response("<html>oops</html>", {
          status: 500,
          headers: { "content-type": "text/html" },
        });
      if (spec.startsWith("err:")) {
        const [, code, status] = spec.split(":");
        return json(code === "none" ? {} : { code }, +status);
      }
      return json(make(spec, turn));
    }
    return real(u, o);
  };
  // The fake learner: answers once each time Pío starts listening.
  let busy = false;
  // The end of a turn is noticed the moment it happens, so a turn that starts
  // right after another is still answered.
  const watch = () =>
    new MutationObserver(() => {
      if (!document.querySelector(".mic-button.listening")) busy = false;
    }).observe(document.documentElement, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  if (document.documentElement) watch();
  else addEventListener("DOMContentLoaded", watch);
  setInterval(async () => {
    const on = !!document.querySelector(".mic-button.listening");
    if (on && !busy) {
      busy = true;
      if (!cfg.silent && !window.__mute) {
        await wait(cfg.delay ?? 400);
        try {
          if (document.querySelector(".mic-button.listening")) {
            await window.__say();
            note("said");
          }
        } catch (e) {
          note("sayfail " + e);
        }
      }
    }
    if (!on) busy = false;
  }, 120);
})();
