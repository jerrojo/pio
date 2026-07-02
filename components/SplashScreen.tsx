'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLanguage, LanguageCode } from '@/lib/languages';

interface SplashScreenProps {
  onComplete: () => void;
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

/**
 * Splash mínimo: el orbe aurora se forma, el wordmark aparece con el
 * gradiente del espectro, y entramos. Sin mascota, sin espera artificial.
 */
export function SplashScreen({ onComplete, userLanguage, targetLanguage }: SplashScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);

  useEffect(() => {
    const duration = 1600;
    const startTime = Date.now();
    let raf = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLoadingProgress(progress);

      if (progress >= 100) {
        setTimeout(() => onComplete(), 250);
      } else {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-dvh flex items-center justify-center px-6">
      <div className="text-center">
        {/* Orbe formándose */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 120, damping: 16 }}
          className="relative mx-auto mb-8 w-28 h-28"
        >
          <div
            className="orb-spin-layer orb-gradient absolute -inset-4 rounded-full"
            style={{ animation: 'orb-spin 6s linear infinite', filter: 'blur(22px)', opacity: 0.7 }}
          />
          <div className="relative w-28 h-28 rounded-full overflow-hidden">
            <div
              className="orb-spin-layer orb-gradient absolute -inset-4"
              style={{ animation: 'orb-spin 6s linear infinite', filter: 'blur(10px)' }}
            />
            <div
              className="absolute inset-[7px] rounded-full"
              style={{
                background:
                  'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.2), rgba(5,6,10,0.55) 55%, rgba(5,6,10,0.8))',
              }}
            />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-5xl font-medium tracking-tight text-spectrum mb-8"
        >
          pío
        </motion.h1>

        <div className="w-56 h-1 rounded-full overflow-hidden mx-auto bg-white/10">
          <motion.div
            animate={{ width: `${loadingProgress}%` }}
            transition={{ duration: 0.1 }}
            className="h-full rounded-full orb-gradient"
          />
        </div>

        <p className="text-slate-500 mt-4 text-sm">
          {getLanguage(userLanguage).name} → {getLanguage(targetLanguage).name}
        </p>
      </div>
    </div>
  );
}
