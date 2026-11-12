"use client";
import { useId, useState } from "react";
import {
  locales,
  names,
  base,
  type Locale,
  type Preferences,
} from "../lib/domain";
import { Icon } from "./Icons";
export function LanguageForm({
  saved,
  onSave,
}: {
  saved: Preferences | null;
  onSave: (p: Preferences) => void;
}) {
  const [native, setNative] = useState<Locale | "">(saved?.native || "");
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
        Mi idioma
        <select
          value={native}
          onChange={(e) => setNative(e.target.value as Locale)}
          required
        >
          <option value="" disabled>
            Selecciona tu idioma
          </option>
          {locales.map((l) => (
            <option value={l} key={l}>
              {names[l]}
            </option>
          ))}
        </select>
      </label>
      <div className="pair-arrow">
        <Icon name="arrow" />
      </div>
      <label>
        Quiero practicar
        <select
          value={target}
          aria-describedby={hintId}
          aria-invalid={sameLanguage || undefined}
          onChange={(e) => setTarget(e.target.value as Locale)}
          required
        >
          <option value="" disabled>
            Selecciona un idioma
          </option>
          {locales.map((l) => (
            <option
              value={l}
              key={l}
              disabled={!!native && base(native) === base(l)}
            >
              {names[l]}
            </option>
          ))}
        </select>
      </label>
      <p
        className={`form-note ${sameLanguage ? "field-error" : ""}`}
        id={hintId}
        aria-live="polite"
      >
        {sameLanguage
          ? "Elige un idioma distinto al tuyo para practicar."
          : "Recordaremos tu selección en este navegador. Puedes cambiarla cuando quieras."}
      </p>
      <button className="primary full" disabled={!valid}>
        Guardar y continuar <Icon name="arrow" size={18} />
      </button>
    </form>
  );
}
