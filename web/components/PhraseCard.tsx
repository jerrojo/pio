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
  current,
  meanings,
}: {
  result: Result;
  locale: Locale;
  disabled: boolean;
  slow: boolean;
  onSlow: (value: boolean) => void;
  onPlay: (word?: string) => void;
  // The word being practised on its own right now.
  current?: string;
  // What each word means in the learner's own language, in phrase order.
  meanings?: string[];
}) {
  const accepted = result.outcome === "accepted";
  const weak = new Set(result.focus.map((word) => canon(word, locale)));
  const now = current ? canon(current, locale) : "";
  const missing = result.evidence?.words.some((w) => w.error === "Omission");
  return (
    <article
      // "conversation" is also the name of the page section, whose spacing
      // must not reach this card.
      className={`phrase-card ${result.outcome === "conversation" ? "reply" : result.outcome}`}
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
      <p lang={locale} className={meanings ? "glossed" : undefined}>
        {/* The words to work on are marked inside the phrase itself, and the
            one being practised right now stands out. */}
        {result.text.split(/(\s+)/).map((part, index) => {
          const keys = part.split(/[-/]/).map((piece) => canon(piece, locale));
          const word =
            now && keys.includes(now) ? (
              <mark key={index} className="now">
                {part}
              </mark>
            ) : weak.size && keys.some((key) => weak.has(key)) ? (
              <mark key={index}>{part}</mark>
            ) : (
              part
            );
          // Words sit at the even places; under each goes what it means.
          const meaning = index % 2 === 0 ? meanings?.[index / 2] : undefined;
          return meaning && part ? (
            <span key={index} className="word">
              {word}
              <small>{meaning}</small>
            </span>
          ) : (
            word
          );
        })}
      </p>
      {result.gloss && <p className="gloss">{result.gloss}</p>}
      {result.focus.length > 0 && !current && (
        <div className="focus-words">
          <span>
            {missing
              ? "Te faltó decir:"
              : result.evidence?.source === "azure-acoustic"
                ? "Hay que pulir:"
                : result.focus.length === 1
                  ? "No se entendió bien:"
                  : "No se entendieron bien:"}
          </span>
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
