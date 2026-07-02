'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { ConversationMode } from '@/types';

interface MainCircleProps {
  mode: ConversationMode;
  score?: number;
  isListening?: boolean;
}

const GOLD = '#f5c86b';
const RING_RADIUS = 47;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function scoreColor(score: number) {
  if (score < 7) return '#f87171';
  if (score < 9) return '#f6b26b';
  return '#4ade80';
}

/**
 * Orbe aurora — la firma visual de Pío.
 * Un núcleo luminoso con gradiente cónico giratorio (espectro iris→hielo→ámbar→rosa)
 * que respira en reposo y acelera al escuchar. Sin texto, sin mascota:
 * el estado se comunica con luz y movimiento.
 */
export function MainCircle({ mode, score, isListening = false }: MainCircleProps) {
  const mastered = mode === 'evaluation' && score !== undefined && score >= 7;
  const progress = mode === 'evaluation' && score !== undefined ? score / 10 : 0;
  const active = isListening || mode !== 'detection';
  const spinDuration = isListening ? '3.5s' : active ? '7s' : '14s';

  return (
    <div className="relative flex items-center justify-center w-72 h-72 select-none">
      {/* Halo exterior difuso */}
      <div
        className="orb-spin-layer orb-gradient absolute w-52 h-52 rounded-full"
        style={{
          animation: `orb-spin ${spinDuration} linear infinite`,
          filter: 'blur(42px)',
          opacity: active ? 0.75 : 0.45,
          transition: 'opacity 0.8s ease',
        }}
      />

      {/* Anillo sonar al escuchar */}
      <AnimatePresence>
        {isListening &&
          [0, 1].map(i => (
            <motion.div
              key={`sonar-${i}`}
              initial={{ scale: 0.75, opacity: 0.45 }}
              animate={{ scale: 1.45, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 1.1, ease: 'easeOut' }}
              className="absolute w-48 h-48 rounded-full border"
              style={{ borderColor: 'rgba(139,156,249,0.55)' }}
            />
          ))}
      </AnimatePresence>

      {/* Onda dorada al dominar la frase */}
      <AnimatePresence>
        {mastered && (
          <motion.div
            key={`gold-wave-${score}`}
            initial={{ scale: 0.9, opacity: 0.9 }}
            animate={{ scale: 1.7, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute w-48 h-48 rounded-full border-2"
            style={{ borderColor: GOLD, boxShadow: `0 0 40px 8px ${GOLD}66` }}
          />
        )}
      </AnimatePresence>

      {/* Arco de progreso del score */}
      <svg viewBox="0 0 100 100" className="absolute w-60 h-60 -rotate-90 pointer-events-none">
        <circle
          cx="50" cy="50" r={RING_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"
        />
        {mode === 'evaluation' && score !== undefined && (
          <motion.circle
            cx="50" cy="50" r={RING_RADIUS}
            fill="none"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeDasharray={RING_CIRCUMFERENCE}
            initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
            animate={{
              strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress),
              stroke: mastered ? GOLD : scoreColor(score),
            }}
            transition={{ type: 'spring', stiffness: 60, damping: 15 }}
          />
        )}
      </svg>

      {/* Orbe: capa cónica nítida */}
      <motion.div
        animate={{ scale: isListening ? [1, 1.05, 1] : [1, 1.02, 1] }}
        transition={{ duration: isListening ? 1.1 : 3.2, repeat: Infinity, ease: 'easeInOut' }}
        className="relative w-44 h-44 rounded-full overflow-hidden"
        role="status"
        aria-label={
          isListening ? 'Escuchando' : mode === 'translation' ? 'Traduciendo' : mode === 'evaluation' ? 'Evaluando' : 'En espera'
        }
        style={{ boxShadow: '0 0 60px rgba(139,156,249,0.28), inset 0 0 30px rgba(255,255,255,0.06)' }}
      >
        <div
          className="orb-spin-layer orb-gradient absolute -inset-6"
          style={{ animation: `orb-spin ${spinDuration} linear infinite`, filter: 'blur(14px)' }}
        />
        {/* Núcleo oscuro translúcido: el orbe es luz contenida, no una esfera plana */}
        <div
          className="absolute inset-[10px] rounded-full"
          style={{
            background:
              'radial-gradient(circle at 38% 30%, rgba(255,255,255,0.18), rgba(5,6,10,0.55) 55%, rgba(5,6,10,0.8))',
            backdropFilter: 'blur(6px)',
          }}
        />
        {/* Destello superior */}
        <div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: 'radial-gradient(circle at 35% 22%, rgba(255,255,255,0.35), transparent 40%)',
          }}
        />
      </motion.div>

      {/* Badge de score */}
      <AnimatePresence>
        {mode === 'evaluation' && score !== undefined && (
          <motion.div
            key={`score-${score}`}
            initial={{ scale: 0, y: 8 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0 }}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            className="absolute -bottom-1 glass-deep rounded-full px-4 py-1.5"
            style={{ borderColor: mastered ? `${GOLD}88` : `${scoreColor(score)}55` }}
          >
            <span
              className="text-base font-semibold tabular-nums"
              style={{ color: mastered ? GOLD : scoreColor(score) }}
            >
              {score}/10
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Anillo dorado giratorio al dominar */}
      {mastered && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, rotate: 360 }}
          transition={{ opacity: { duration: 0.4 }, rotate: { duration: 6, repeat: Infinity, ease: 'linear' } }}
          className="absolute w-[228px] h-[228px] rounded-full pointer-events-none"
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
