'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ConversationMode } from '@/types';

interface MainCircleProps {
  mode: ConversationMode;
  score?: number;
  isListening?: boolean;
}

/**
 * Paleta por estado (spec: cyan → lime → rojo/amarillo/verde → dorado)
 */
function getPalette(mode: ConversationMode, score?: number) {
  if (mode === 'detection') {
    return { base: '#06b6d4', glow: 'rgba(6,182,212,0.45)', label: 'Escuchando' };
  }
  if (mode === 'translation') {
    return { base: '#84cc16', glow: 'rgba(132,204,22,0.55)', label: 'Traduciendo' };
  }
  // evaluation
  if (score === undefined) {
    return { base: '#94a3b8', glow: 'rgba(148,163,184,0.35)', label: 'Evaluando' };
  }
  if (score < 7) return { base: '#ef4444', glow: 'rgba(239,68,68,0.5)', label: 'Repite' };
  if (score < 9) return { base: '#eab308', glow: 'rgba(234,179,8,0.5)', label: 'Bien' };
  return { base: '#22c55e', glow: 'rgba(34,197,94,0.5)', label: '¡Excelente!' };
}

const GOLD = '#fbbf24';
const RING_RADIUS = 47; // % del viewBox 100x100
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function MainCircle({ mode, score, isListening = false }: MainCircleProps) {
  const palette = getPalette(mode, score);
  const mastered = mode === 'evaluation' && score !== undefined && score >= 7;
  const progress = mode === 'evaluation' && score !== undefined ? score / 10 : 0;

  return (
    <div className="relative flex items-center justify-center w-80 h-80 select-none">
      {/* Sonar: anillos expandiéndose en modo detección */}
      <AnimatePresence>
        {mode === 'detection' &&
          [0, 1].map(i => (
            <motion.div
              key={`sonar-${i}`}
              initial={{ scale: 0.8, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: 'easeOut' }}
              className="absolute w-64 h-64 rounded-full border-2"
              style={{ borderColor: palette.base }}
            />
          ))}
      </AnimatePresence>

      {/* Onda dorada al aprobar (se dispara una sola vez por score) */}
      <AnimatePresence>
        {mastered && (
          <motion.div
            key={`gold-wave-${score}`}
            initial={{ scale: 0.9, opacity: 0.9 }}
            animate={{ scale: 1.7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-64 h-64 rounded-full border-4"
            style={{ borderColor: GOLD, boxShadow: `0 0 40px 8px ${GOLD}88` }}
          />
        )}
      </AnimatePresence>

      {/* Partículas doradas de celebración */}
      <AnimatePresence>
        {mastered &&
          Array.from({ length: 8 }).map((_, i) => {
            const angle = (i / 8) * Math.PI * 2;
            return (
              <motion.div
                key={`particle-${score}-${i}`}
                initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                animate={{
                  x: Math.cos(angle) * 170,
                  y: Math.sin(angle) * 170,
                  scale: 0,
                  opacity: 0,
                }}
                transition={{ duration: 1, ease: 'easeOut', delay: 0.1 }}
                className="absolute w-3 h-3 rounded-full"
                style={{ backgroundColor: GOLD }}
              />
            );
          })}
      </AnimatePresence>

      {/* Arco de progreso del score (rojo→amarillo→verde, dorado al aprobar) */}
      <svg viewBox="0 0 100 100" className="absolute w-72 h-72 -rotate-90 pointer-events-none">
        <circle
          cx="50" cy="50" r={RING_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="2.5"
        />
        <motion.circle
          cx="50" cy="50" r={RING_RADIUS}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={RING_CIRCUMFERENCE}
          animate={{
            strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress),
            stroke: mastered ? GOLD : palette.base,
          }}
          transition={{ type: 'spring', stiffness: 60, damping: 15 }}
        />
      </svg>

      {/* Círculo principal con transición suave de color y glow */}
      <motion.div
        animate={{
          backgroundColor: palette.base,
          scale:
            mode === 'detection'
              ? isListening
                ? [1, 1.06, 1]
                : [1, 1.03, 1]
              : 1,
          boxShadow:
            mode === 'translation'
              ? [
                  `0 0 40px 6px ${palette.glow}`,
                  `0 0 70px 16px ${palette.glow}`,
                  `0 0 40px 6px ${palette.glow}`,
                ]
              : `0 0 50px 10px ${palette.glow}`,
        }}
        transition={{
          backgroundColor: { duration: 0.6, ease: 'easeInOut' },
          scale: { duration: isListening ? 1 : 2, repeat: mode === 'detection' ? Infinity : 0, ease: 'easeInOut' },
          boxShadow: { duration: 1.6, repeat: mode === 'translation' ? Infinity : 0, ease: 'easeInOut' },
        }}
        className="relative w-64 h-64 rounded-full flex flex-col items-center justify-center"
        role="status"
        aria-label={palette.label}
      >
        {/* Brillo radial superior (volumen 3D sutil) */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 35% 28%, rgba(255,255,255,0.35), rgba(255,255,255,0) 55%)',
          }}
        />

        <span className="text-6xl font-bold text-white drop-shadow-md tracking-wide">PÍO</span>

        <AnimatePresence mode="wait">
          <motion.span
            key={palette.label}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 0.9, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="mt-1 text-sm font-medium text-white/90 uppercase tracking-widest"
          >
            {palette.label}
          </motion.span>
        </AnimatePresence>

        {/* Badge de score */}
        <AnimatePresence>
          {mode === 'evaluation' && score !== undefined && (
            <motion.div
              key={`score-${score}`}
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0 }}
              transition={{ type: 'spring', stiffness: 400, damping: 20 }}
              className="absolute -top-3 -right-3 w-16 h-16 rounded-full bg-white shadow-xl flex items-center justify-center border-2"
              style={{ borderColor: mastered ? GOLD : palette.base }}
            >
              <span className="text-xl font-bold" style={{ color: mastered ? '#b45309' : palette.base }}>
                {score}/10
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Anillo dorado permanente mientras se mantenga aprobado */}
      {mastered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ opacity: { duration: 0.4 }, rotate: { duration: 6, repeat: Infinity, ease: 'linear' } }}
          className="absolute w-[272px] h-[272px] rounded-full pointer-events-none"
          style={{
            background: `conic-gradient(from 0deg, ${GOLD}00, ${GOLD}cc, ${GOLD}00 30%)`,
            WebkitMask: 'radial-gradient(circle, transparent 66%, black 67%, black 70%, transparent 71%)',
            mask: 'radial-gradient(circle, transparent 66%, black 67%, black 70%, transparent 71%)',
          }}
        />
      )}
    </div>
  );
}
