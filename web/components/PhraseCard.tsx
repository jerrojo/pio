"use client";
import { names, type Locale, type Result } from "../lib/domain";
import { Icon } from "./Icons";
export function PhraseCard({
  result,
  locale,
  disabled,
  slow,
  onSlow,
  onPlay,
}: {
  result: Result;
  locale: Locale;
  disabled: boolean;
  slow: boolean;
  onSlow: (value: boolean) => void;
  onPlay: (text: string) => void;
}) {
  const accepted = result.outcome === "accepted";
  return (
    <article
      className={`phrase-card ${result.outcome}`}
      aria-label="Frase de práctica"
    >
      <div className="phrase-top">
        {accepted && (
          <span className="phrase-badge">
            <Icon name="check" size={16} />
          </span>
        )}
        <span>
          {accepted
            ? "Bien dicho"
            : result.outcome === "conversation"
              ? "Pío"
              : `Tu frase en ${names[locale].split(" ·")[0].toLocaleLowerCase()}`}
        </span>
      </div>
      <p lang={locale}>{result.text}</p>
      {result.focus.length > 0 && (
        <div className="focus-words">
          <span>Escucha estas palabras:</span>
          {result.focus.map((word, index) => (
            <button
              key={`${word}-${index}`}
              disabled={disabled}
              onClick={() => onPlay(word)}
              aria-label={`Escuchar ${word}`}
            >
              <Icon name="play" size={14} />
              <span lang={locale}>{word}</span>
            </button>
          ))}
          <p>Después, repite la frase completa.</p>
        </div>
      )}
      <div className="phrase-actions">
        <button
          className="listen"
          disabled={disabled}
          onClick={() => onPlay(result.text)}
        >
          <span className="listen-icon">
            <Icon name="play" size={16} />
          </span>
          Escuchar frase
        </button>
        <label className="switch-row">
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={slow}
            onChange={(e) => onSlow(e.target.checked)}
          />
          Más despacio
        </label>
      </div>
    </article>
  );
}
