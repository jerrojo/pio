'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { getLanguage, LanguageCode } from '@/lib/languages';

interface SplashScreenProps {
  onComplete: () => void;
  userLanguage: LanguageCode;
  targetLanguage: LanguageCode;
}

export function SplashScreen({ onComplete, userLanguage, targetLanguage }: SplashScreenProps) {
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    const duration = 3200;
    const startTime = Date.now();
    let raf = 0;

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLoadingProgress(progress);

      if (progress >= 100) {
        setIsComplete(true);
        setTimeout(() => onComplete(), 400);
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
        {/* Pollito con bounce Pixar-style */}
        <motion.div
          initial={{ scale: 0, y: 40 }}
          animate={{
            scale: isComplete ? 1.15 : 1,
            y: isComplete ? -8 : [0, -14, 0],
          }}
          transition={{
            scale: { type: 'spring', stiffness: 260, damping: 14 },
            y: isComplete
              ? { duration: 0.3 }
              : { duration: 1.4, repeat: Infinity, ease: 'easeInOut' },
          }}
          className="relative mb-6 inline-block"
        >
          <div
            className="w-36 h-36 mx-auto rounded-full flex items-center justify-center"
            style={{
              background: 'radial-gradient(circle at 35% 28%, #fde68a, #fbbf24 60%, #f59e0b)',
              boxShadow: '0 0 70px 12px rgba(251,191,36,0.3)',
            }}
          >
            <span className="text-6xl select-none">🐣</span>
          </div>
          {/* sombra */}
          <motion.div
            animate={{ scaleX: isComplete ? 0.7 : [1, 0.75, 1] }}
            transition={{ duration: 1.4, repeat: isComplete ? 0 : Infinity, ease: 'easeInOut' }}
            className="mx-auto mt-4 h-2 w-24 rounded-full bg-black/40 blur-sm"
          />
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-5xl font-extrabold tracking-wide text-white mb-8"
        >
          P<span className="text-amber-400">Í</span>O
        </motion.h1>

        <div className="w-64 h-1.5 glass rounded-full overflow-hidden mx-auto">
          <motion.div
            animate={{ width: `${loadingProgress}%` }}
            transition={{ duration: 0.1 }}
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-300"
          />
        </div>

        <p className="text-slate-400 mt-4 text-sm">
          {getLanguage(userLanguage).flag} {getLanguage(userLanguage).name} →{' '}
          {getLanguage(targetLanguage).flag} {getLanguage(targetLanguage).name}
        </p>
      </div>
    </div>
  );
}
