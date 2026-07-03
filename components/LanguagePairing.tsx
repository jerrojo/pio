'use client';

import { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { LanguageCode } from '@/types';
import { getAllLanguages } from '@/lib/languages';
import { t, langName, langAccent, ENDONYMS } from '@/lib/i18n';
import { ArrowRight } from 'lucide-react';

interface LanguagePairingProps {
  initialNative?: LanguageCode;
  initialTarget?: LanguageCode;
  onConfirm: (native: LanguageCode, target: LanguageCode) => void;
}

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Onboarding: elegir idioma nativo y el idioma a aprender.
 * No permite elegir el mismo en ambos.
 * Restricción como identidad: superficies hairline casi monocromas;
 * el color solo aparece en el hairline iris de lo seleccionado.
 * Las banderas son la única excepción a la regla anti-emoji: identifican
 * cada idioma de un vistazo. Todo el copy vive en el idioma nativo elegido
 * y cambia en vivo al tocar un chip de "Yo hablo".
 */
export function LanguagePairing({
  initialNative = 'en',
  initialTarget = 'es',
  onConfirm,
}: LanguagePairingProps) {
  const [native, setNative] = useState<LanguageCode>(initialNative);
  const [target, setTarget] = useState<LanguageCode>(initialTarget);
  const languages = getAllLanguages();

  const selectTarget = (code: LanguageCode) => {
    setTarget(code);
    if (code === native) {
      // si chocan, mueve el nativo al anterior target
      setNative(target);
    }
  };

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: EASE }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-11">
            {/* Eco del orbe: la única gota de espectro en esta pantalla */}
            <motion.span
              className="mx-auto block w-3 h-3 rounded-full orb-gradient"
              animate={{ scale: [1, 1.25, 1], opacity: [0.8, 1, 0.8] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              aria-hidden
            />
            <h1 className="text-[28px] leading-tight font-medium tracking-tight text-white mt-6">
              {t(native, 'pairingTitle')}
            </h1>
            <p className="text-slate-400 mt-3 text-[15px] leading-relaxed max-w-[40ch] mx-auto">
              {t(native, 'pairingSubtitle')}
            </p>
          </div>

          {/* Objetivo */}
          <div className="mb-9">
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3.5 px-1">
              {t(native, 'pairingLearnLabel')}
            </p>
            <div className="grid grid-cols-2 gap-3">
              {languages.map((lang, i) => {
                const active = target === lang.code;
                return (
                  <motion.button
                    key={lang.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: EASE, delay: 0.04 + 0.035 * i }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => selectTarget(lang.code)}
                    className="relative glass rounded-2xl p-4 text-left"
                    style={{
                      transition:
                        'border-color 0.3s var(--ease-glide), background 0.3s var(--ease-glide)',
                      ...(active
                        ? {
                            borderColor: 'rgba(139, 156, 249, 0.55)',
                            background: 'var(--surface-raised)',
                          }
                        : {}),
                    }}
                    aria-pressed={active}
                  >
                    <div className="flex items-center gap-3.5">
                      {/* Bandera en placa hairline: la excepción anti-emoji */}
                      <span
                        className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[22px] leading-none border transition-colors duration-300 ${
                          active
                            ? 'border-white/20 bg-white/[0.08]'
                            : 'border-white/10 bg-white/[0.05]'
                        }`}
                        aria-hidden
                      >
                        {lang.flag}
                      </span>
                      <div className="min-w-0">
                        <div className="font-medium text-white text-[15px]">
                          {langName(native, lang.code)}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          {langAccent(native, lang.code)}
                        </div>
                      </div>
                    </div>
                    {/* Punto de selección: iris sólido, 6px, sin glow */}
                    <motion.span
                      aria-hidden
                      className="absolute top-3.5 right-3.5 w-1.5 h-1.5 rounded-full"
                      initial={false}
                      animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
                      transition={{ duration: 0.25, ease: EASE }}
                      style={{ background: 'var(--iris)' }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Nativo: chips segmentados — cada idioma en su propio nombre */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.28 }}
            className="mb-10"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3.5 px-1">
              {t(native, 'pairingISpeak')}
            </p>
            <div
              className="flex flex-wrap gap-2"
              role="radiogroup"
              aria-label={t(native, 'pairingNativeAria')}
            >
              {languages.map(lang => {
                const activeN = native === lang.code;
                return (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => {
                      const code = lang.code;
                      setNative(code);
                      if (code === target) setTarget(native);
                    }}
                    role="radio"
                    aria-checked={activeN}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border inline-flex items-center gap-2 ${
                      activeN
                        ? 'text-white bg-white/[0.08]'
                        : 'text-slate-300 border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:text-white'
                    }`}
                    style={{
                      transition:
                        'background 0.25s var(--ease-glide), border-color 0.25s var(--ease-glide), color 0.25s var(--ease-glide)',
                      ...(activeN ? { borderColor: 'rgba(139, 156, 249, 0.55)' } : {}),
                    }}
                  >
                    <span className="text-[15px] leading-none" aria-hidden>
                      {lang.flag}
                    </span>
                    {ENDONYMS[lang.code]}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: EASE, delay: 0.36 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onConfirm(native, target)}
            className="btn-primary w-full py-4 text-[17px] flex items-center justify-center gap-2 group"
          >
            {t(native, 'pairingStart')}
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
