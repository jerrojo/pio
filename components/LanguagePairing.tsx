'use client';

import { useState } from 'react';
import { motion, MotionConfig } from 'framer-motion';
import { LanguageCode } from '@/types';
import { getAllLanguages } from '@/lib/languages';
import { ArrowRight } from 'lucide-react';

interface LanguagePairingProps {
  initialNative?: LanguageCode;
  initialTarget?: LanguageCode;
  onConfirm: (native: LanguageCode, target: LanguageCode) => void;
}

const SPRING = { type: 'spring', stiffness: 380, damping: 28 } as const;

/**
 * Onboarding: elegir idioma nativo y el idioma a aprender.
 * No permite elegir el mismo en ambos.
 * Identidad: la luz es la personalidad — nada de banderas ni mascotas,
 * cada idioma es un monograma tipográfico que se enciende al elegirlo.
 */
export function LanguagePairing({
  initialNative = 'es',
  initialTarget = 'en',
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
      <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          className="w-full max-w-lg"
        >
          <div className="text-center mb-9">
            <motion.span
              className="mx-auto block w-3 h-3 rounded-full orb-gradient"
              animate={{ scale: [1, 1.3, 1], opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
              style={{ boxShadow: '0 0 18px rgba(139,156,249,0.65)' }}
              aria-hidden
            />
            <h1 className="text-3xl font-medium tracking-tight text-white mt-5">
              ¿Qué idioma quieres aprender?
            </h1>
            <p className="text-slate-400 mt-2.5 text-[15px] leading-relaxed">
              Habla con Pío: traduce lo que digas y evalúa tu pronunciación en tiempo real
            </p>
          </div>

          {/* Objetivo */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {languages.map((lang, i) => {
              const active = target === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  initial={{ opacity: 0, y: 14, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ ...SPRING, delay: 0.05 + 0.045 * i }}
                  whileTap={{ scale: 0.965 }}
                  onClick={() => selectTarget(lang.code)}
                  className={`relative glass rounded-2xl p-4 text-left overflow-hidden ${
                    active ? '' : 'hover:bg-white/[0.07]'
                  }`}
                  style={{
                    transition: 'border-color 0.35s var(--ease-glide), box-shadow 0.35s var(--ease-glide)',
                    ...(active
                      ? {
                          borderColor: 'rgba(139,156,249,0.65)',
                          boxShadow:
                            '0 0 34px -6px rgba(139,156,249,0.35), inset 0 1px 0 rgba(255,255,255,0.12)',
                        }
                      : {}),
                  }}
                  aria-pressed={active}
                >
                  {/* Baño de luz interior del seleccionado */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-0 pointer-events-none"
                    animate={{ opacity: active ? 1 : 0 }}
                    transition={{ duration: 0.4 }}
                    style={{
                      background:
                        'radial-gradient(120% 90% at 18% 0%, rgba(139,156,249,0.16), rgba(108,212,255,0.05) 55%, transparent 80%)',
                    }}
                  />
                  <div className="relative flex items-center gap-3">
                    <span
                      className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center text-[13px] font-semibold tracking-[0.14em] ${
                        active ? 'text-white' : 'text-slate-300'
                      }`}
                      style={
                        active
                          ? {
                              background:
                                'linear-gradient(135deg, rgba(139,156,249,0.5), rgba(108,212,255,0.32))',
                              boxShadow:
                                '0 0 18px -4px rgba(139,156,249,0.55), inset 0 1px 0 rgba(255,255,255,0.25)',
                            }
                          : {
                              background: 'rgba(255,255,255,0.06)',
                              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.08)',
                            }
                      }
                      aria-hidden
                    >
                      {lang.code.toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <div className={`font-medium ${active ? 'text-spectrum' : 'text-white'}`}>
                        {lang.name}
                      </div>
                      <div className="text-xs text-slate-400 truncate">{lang.accent}</div>
                    </div>
                  </div>
                  {/* Punto de luz del seleccionado */}
                  <motion.span
                    aria-hidden
                    className="absolute top-3 right-3 w-2 h-2 rounded-full orb-gradient"
                    initial={false}
                    animate={{ scale: active ? 1 : 0, opacity: active ? 1 : 0 }}
                    transition={SPRING}
                    style={{ boxShadow: '0 0 12px rgba(139,156,249,0.8)' }}
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Nativo: chips segmentados en vez de select nativo */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.32 }}
            className="glass rounded-2xl p-4 mb-8"
          >
            <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-3">
              Yo hablo
            </p>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Tu idioma nativo">
              {languages.map(lang => {
                const activeN = native === lang.code;
                return (
                  <motion.button
                    key={lang.code}
                    whileTap={{ scale: 0.93 }}
                    transition={SPRING}
                    onClick={() => {
                      const code = lang.code;
                      setNative(code);
                      if (code === target) setTarget(native);
                    }}
                    role="radio"
                    aria-checked={activeN}
                    className={`px-3.5 py-2 rounded-full text-sm font-medium border ${
                      activeN
                        ? 'text-white'
                        : 'text-slate-300 border-white/10 bg-white/[0.04] hover:bg-white/10 hover:text-white'
                    }`}
                    style={{
                      transition:
                        'background 0.3s var(--ease-glide), border-color 0.3s var(--ease-glide), box-shadow 0.3s var(--ease-glide), color 0.3s var(--ease-glide)',
                      ...(activeN
                        ? {
                            background:
                              'linear-gradient(120deg, rgba(139,156,249,0.38), rgba(108,212,255,0.24))',
                            borderColor: 'rgba(139,156,249,0.6)',
                            boxShadow:
                              '0 0 20px -4px rgba(139,156,249,0.45), inset 0 1px 0 rgba(255,255,255,0.2)',
                          }
                        : {}),
                    }}
                  >
                    {lang.name}
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...SPRING, delay: 0.4 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onConfirm(native, target)}
            className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 group"
          >
            Empezar
            <ArrowRight className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" />
          </motion.button>
        </motion.div>
      </div>
    </MotionConfig>
  );
}
