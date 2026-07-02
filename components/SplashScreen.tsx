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
    const duration = 3800;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min((elapsed / duration) * 100, 100);
      setLoadingProgress(progress);

      if (progress >= 100 && !isComplete) {
        setIsComplete(true);
        setTimeout(() => onComplete(), 300);
      } else {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, [isComplete, onComplete]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 flex items-center justify-center">
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ 
            scale: isComplete ? 1.2 : 1,
            opacity: 1,
            rotate: isComplete ? 360 : 0,
          }}
          transition={{ 
            duration: 3.8,
            ease: [0.43, 0.13, 0.23, 0.96],
          }}
          className="relative mb-8"
        >
          <motion.div
            animate={{
              scale: isComplete ? [1, 1.1, 1] : [1, 1.05, 1],
              borderRadius: isComplete ? '50%' : '20%',
            }}
            transition={{
              duration: 3.8,
              repeat: isComplete ? 0 : Infinity,
              repeatDelay: 0.5,
            }}
            className="w-32 h-32 mx-auto bg-white rounded-full flex items-center justify-center shadow-2xl"
          >
            <span className="text-6xl font-bold text-primary-600">P</span>
            <motion.span
              animate={{
                scale: isComplete ? 1.2 : 1,
              }}
              className="text-6xl font-bold text-primary-600"
            >
              Í
            </motion.span>
            <motion.span
              animate={{
                scale: isComplete ? 1.2 : 1,
                borderRadius: isComplete ? '50%' : '0%',
              }}
              className="text-6xl font-bold text-primary-600 inline-block w-16 h-16 flex items-center justify-center"
            >
              O
            </motion.span>
          </motion.div>
        </motion.div>

        <div className="w-64 h-1 bg-white/20 rounded-full overflow-hidden mx-auto">
          <motion.div
            animate={{ width: `${loadingProgress}%` }}
            transition={{ duration: 0.1 }}
            className="h-full bg-white rounded-full"
          />
        </div>
        
        <p className="text-white/80 mt-4 text-sm">
          Cargando {getLanguage(userLanguage).name} → {getLanguage(targetLanguage).name}
        </p>
      </div>
    </div>
  );
}


