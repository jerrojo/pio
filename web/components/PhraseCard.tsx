"use client";
import { names, type Locale, type Result } from "../lib/domain";
import { canon } from "../lib/words";
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
  onPlay: (word?: string) => void;
}) {
  const accepted = result.outcome === "accepted";
  const weak = new Set(result.focus.map((word) => canon(word, locale)));
  const missing = result.evidence?.words.some((w) => w.error === "Omission");
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
      <p lang={locale}>
        {/* The words to work on are marked inside the phrase itself. */}
        {result.text
          .split(/(\s+)/)
          .map((part, index) =>
            weak.size &&
            part
              .split(/[-/]/)
              .some((piece) => weak.has(canon(piece, locale))) ? (
              <mark key={index}>{part}</mark>
            ) : (
              part
            ),
          )}
      </p>
      {result.focus.length > 0 && (
        <div className="focus-words">
          <span>{missing ? "Te faltó decir:" : "No se entendieron bien:"}</span>
          {result.focus.map((word, index) => (
            <button
              key={`${word}-${index}`}
              disabled={disabled}
              onClick={() => onPlay(word)}
            >
              <Icon name="play" size={14} />
              <span className="sr-only">Escuchar </span>
              <span lang={locale}>{word}</span>
            </button>
          ))}
        </div>
      )}
      <div className="phrase-actions">
        <button className="listen" disabled={disabled} onClick={() => onPlay()}>
          <span className="listen-icon">
            <Icon name="play" size={16} />
          </span>
          Escuchar
        </button>
        <label className="switch-row">
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={slow}
            onChange={(e) => onSlow(e.target.checked)}
          />
          Despacio
        </label>
      </div>
    </article>
  );
}
