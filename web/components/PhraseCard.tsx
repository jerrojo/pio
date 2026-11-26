"use client";
import type { Copy } from "../lib/copy";
import type { Locale, Result } from "../lib/domain";
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
  playing,
  copy,
  language,
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
  // Pío's voice is saying the phrase right now.
  playing?: boolean;
  // The words of the interface, and the name of the language of the phrase,
  // both in the learner's own language.
  copy: Copy;
  language: string;
}) {
  const accepted = result.outcome === "accepted";
  const weak = new Set(result.focus.map((word) => canon(word, locale)));
  const now = current ? canon(current, locale) : "";
  const missing = result.evidence?.words.some((w) => w.error === "Omission");
  // How clearly the whole phrase came through, from 0 to 10. Only for a
  // phrase said in full: one word practised alone gets no number.
  const graded =
    !current &&
    (accepted || result.outcome === "practice") &&
    result.evidence?.mode === "scripted" &&
    result.evidence.words.length > 1;
  const score = graded ? Math.round(result.evidence!.accuracy / 10) : null;
  return (
    <article
      // "conversation" is also the name of the page section, whose spacing
      // must not reach this card.
      className={`phrase-card ${result.outcome === "conversation" ? "reply" : result.outcome}`}
      aria-label={copy.card.label}
    >
      <div className="phrase-top">
        {accepted && (
          <span className="phrase-badge">
            <Icon name="check" size={16} />
          </span>
        )}
        <span>
          {accepted
            ? copy.card.wellSaid
            : result.outcome === "conversation"
              ? "Pío"
              : copy.card.yourPhrase(language)}
        </span>
        {score !== null && (
          <span
            className="score"
            role="img"
            aria-label={copy.card.score(score)}
          >
            {score}
            <small>/10</small>
          </span>
        )}
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
          // The room is kept from the start, before the meanings arrive.
          if (!meanings || index % 2 || !part) return word;
          const meaning = meanings[index / 2];
          return (
            <span key={index} className="word">
              {word}
              <small
                key={meaning ? "meaning" : "waiting"}
                style={{ animationDelay: `${index * 25}ms` }}
              >
                {meaning || "\u00a0"}
              </small>
            </span>
          );
        })}
      </p>
      {result.gloss && <p className="gloss">{result.gloss}</p>}
      {result.focus.length > 0 && !current && (
        <div className="focus-words">
          <span>
            {missing
              ? copy.card.leftOut
              : result.evidence?.source === "azure-acoustic"
                ? copy.card.polish
                : result.focus.length === 1
                  ? copy.card.unclearOne
                  : copy.card.unclearMany}
          </span>
          {result.focus.map((word, index) => (
            <button
              key={`${word}-${index}`}
              disabled={disabled}
              onClick={() => onPlay(word)}
            >
              <Icon name="play" size={14} />
              <span className="sr-only">{copy.card.listen} </span>
              <span lang={locale}>{word}</span>
            </button>
          ))}
        </div>
      )}
      <div className="phrase-actions">
        <button className="listen" disabled={disabled} onClick={() => onPlay()}>
          <span className="listen-icon">
            {playing ? (
              <span className="bars">
                <i />
                <i />
                <i />
              </span>
            ) : (
              <Icon name="play" size={16} />
            )}
          </span>
          {copy.card.listen}
        </button>
        <label className="switch-row">
          <input
            type="checkbox"
            role="switch"
            className="switch"
            checked={slow}
            onChange={(e) => onSlow(e.target.checked)}
          />
          {copy.card.slow}
        </label>
      </div>
    </article>
  );
}
