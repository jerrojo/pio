'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { LanguageCode } from '@/types';
import { getAllLanguages } from '@/lib/languages';
import { ArrowRight } from 'lucide-react';

interface LanguagePairingProps {
  initialNative?: LanguageCode;
  initialTarget?: LanguageCode;
  onConfirm: (native: LanguageCode, target: LanguageCode) => void;
}

/**
 * Onboarding: elegir idioma nativo y el idioma a aprender.
 * No permite elegir el mismo en ambos.
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
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 py-10">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="text-center mb-8">
          <span className="mx-auto block w-3 h-3 rounded-full orb-gradient" aria-hidden />
          <h1 className="text-3xl font-medium tracking-tight text-white mt-4">
            ¿Qué idioma quieres aprender?
          </h1>
          <p className="text-slate-500 mt-2">
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 * i }}
                onClick={() => selectTarget(lang.code)}
                className={`glass rounded-2xl p-4 text-left transition-all ${
                  active ? 'bg-white/10' : 'hover:bg-white/10'
                }`}
                style={active ? { borderColor: 'rgba(139,156,249,0.6)', boxShadow: '0 0 24px rgba(139,156,249,0.18)' } : undefined}
                aria-pressed={active}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{lang.flag}</span>
                  <div>
                    <div className={`font-medium ${active ? 'text-spectrum' : 'text-white'}`}>
                      {lang.name}
                    </div>
                    <div className="text-xs text-slate-400">{lang.accent}</div>
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Nativo */}
        <div className="glass rounded-2xl p-4 mb-8 flex items-center justify-between">
          <span className="text-slate-300 text-sm font-medium">Yo hablo</span>
          <select
            value={native}
            onChange={e => {
              const code = e.target.value as LanguageCode;
              setNative(code);
              if (code === target) setTarget(native);
            }}
            className="bg-[#0a0c14] text-white rounded-lg px-3 py-2 text-sm font-semibold border border-white/10 focus:outline-none focus:ring-2 focus:ring-[#8b9cf9]"
          >
            {languages.map(lang => (
              <option key={lang.code} value={lang.code}>
                {lang.flag} {lang.name}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={() => onConfirm(native, target)}
          className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2"
        >
          Empezar
          <ArrowRight className="w-5 h-5" />
        </button>
      </motion.div>
    </div>
  );
}
