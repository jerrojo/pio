"use client";
import { useId, useState } from "react";
import { browserLocale, copyFor, languageName, ownName } from "../lib/copy";
import { locales, base, type Locale, type Preferences } from "../lib/domain";
import { Icon } from "./Icons";
export function LanguageForm({
  saved,
  onSave,
  ui,
  onNative,
}: {
  saved: Preferences | null;
  onSave: (p: Preferences) => void;
  // The language the form is written in right now.
  ui: string;
  // Told at once when the learner picks their own language, so everything
  // switches to it before saving.
  onNative: (locale: Locale) => void;
}) {
  const t = copyFor(ui).form;
  // A first visit starts with the browser's own language already chosen.
  const [native, setNative] = useState<Locale | "">(() => {
    if (saved) return saved.native;
    return typeof navigator === "undefined"
      ? ""
      : browserLocale(navigator.languages || [navigator.language]);
  });
  const [target, setTarget] = useState<Locale | "">(saved?.target || "");
  const valid = native && target && base(native) !== base(target);
  const hintId = useId();
  const sameLanguage = !!native && !!target && base(native) === base(target);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (valid) onSave({ version: 3, native, target });
      }}
      className="language-form"
    >
      <label>
        {t.mine}
        <select
          value={native}
          onChange={(e) => {
            const mine = e.target.value as Locale;
            setNative(mine);
            // Keeping the pair valid: the language to practise cannot be
            // the learner's own.
            if (target && base(target) === base(mine)) setTarget("");
            onNative(mine);
          }}
          required
        >
          <option value="" disabled>
            {t.pickMine}
          </option>
          {locales.map((l) => (
            <option value={l} key={l} lang={l}>
              {/* Each language in its own words, so anyone finds theirs. */}
              {ownName(l)}
            </option>
          ))}
        </select>
      </label>
      <div className="pair-arrow">
        <Icon name="arrow" />
      </div>
      <label>
        {t.practise}
        <select
          value={target}
          aria-describedby={hintId}
          aria-invalid={sameLanguage || undefined}
          onChange={(e) => setTarget(e.target.value as Locale)}
          required
        >
          <option value="" disabled>
            {t.pick}
          </option>
          {locales.map((l) => (
            <option
              value={l}
              key={l}
              disabled={!!native && base(native) === base(l)}
            >
              {languageName(l, ui, true)}
            </option>
          ))}
        </select>
      </label>
      <p
        className={`form-note ${sameLanguage ? "field-error" : ""}`}
        id={hintId}
        aria-live="polite"
      >
        {sameLanguage ? t.different : t.remember}
      </p>
      <button className="primary full" disabled={!valid}>
        {t.save} <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
