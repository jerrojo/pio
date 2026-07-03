'use client';

import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { ConversationMode } from '@/types';

interface MainCircleProps {
  mode: ConversationMode;
  score?: number;
  isListening?: boolean;
  /** aprobado estricto (si no se pasa, se infiere de score>=7) */
  passed?: boolean;
}

const GOLD = '#f5c86b';
const RING_RADIUS = 47;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;
/* Curva seno — respiración orgánica (inhala 40%, exhala 60%) */
const BREATHE_TIMES = [0, 0.4, 1];
const SONAR_EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];

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
export function MainCircle({ mode, score, isListening = false, passed }: MainCircleProps) {
  const reduceMotion = useReducedMotion();
  const mastered = mode === 'evaluation' && score !== undefined && (passed ?? score >= 7);
  const progress = mode === 'evaluation' && score !== undefined ? score / 10 : 0;
  const active = isListening || mode !== 'detection';
  const spinDuration = isListening ? '3.5s' : active ? '7s' : '14s';
  const arcColor = score !== undefined ? (mastered ? GOLD : scoreColor(score)) : GOLD;

  return (
    <div className="relative flex items-center justify-center w-72 h-72 select-none">
      {/* Halo exterior difuso: se expande y aviva cuando la IA está presente */}
      <motion.div
        aria-hidden
        animate={{
          opacity: isListening ? 0.9 : active ? 0.72 : 0.42,
          scale: isListening ? 1.12 : active ? 1.04 : 1,
        }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        className="absolute w-52 h-52"
      >
        <div
          className="orb-spin-layer orb-gradient w-full h-full rounded-full"
          style={{
            animation: reduceMotion ? 'none' : `orb-spin ${spinDuration} linear infinite`,
            filter: 'blur(42px)',
          }}
        />
      </motion.div>

      {/* Anillo sonar al escuchar */}
      <AnimatePresence>
        {isListening &&
          !reduceMotion &&
          [0, 1].map(i => (
            <motion.div
              key={`sonar-${i}`}
              initial={{ scale: 0.72, opacity: 0.5 }}
              animate={{ scale: 1.5, opacity: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 1.2, ease: SONAR_EASE }}
              className="absolute w-48 h-48 rounded-full border"
              style={{
                borderColor: 'rgba(139,156,249,0.55)',
                boxShadow: '0 0 18px -6px rgba(108,212,255,0.5)',
              }}
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
            transition={{ duration: 1.3, ease: SONAR_EASE }}
            className="absolute w-48 h-48 rounded-full border-2"
            style={{ borderColor: GOLD, boxShadow: `0 0 40px 8px ${GOLD}66` }}
          />
        )}
      </AnimatePresence>

      {/* Destello al cambiar de estado: la luz anuncia la transición */}
      {!reduceMotion && (
        <AnimatePresence>
          <motion.div
            key={`flash-${mode}`}
            initial={{ opacity: 0.4, scale: 0.92 }}
            animate={{ opacity: 0, scale: 1.28 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
            className="absolute w-44 h-44 rounded-full pointer-events-none"
            style={{
              background: 'radial-gradient(circle, rgba(255,255,255,0.28), transparent 68%)',
            }}
            aria-hidden
          />
        </AnimatePresence>
      )}

      {/* Arco de progreso del score */}
      <svg viewBox="0 0 100 100" className="absolute w-60 h-60 -rotate-90 pointer-events-none">
        <circle
          cx="50" cy="50" r={RING_RADIUS}
          fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="2"
        />
        {mode === 'evaluation' && score !== undefined && (
          <>
            {/* Glow bajo el arco: misma trayectoria, difusa */}
            <motion.circle
              cx="50" cy="50" r={RING_RADIUS}
              fill="none"
              strokeWidth="5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE, opacity: 0 }}
              animate={{
                strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress),
                stroke: arcColor,
                opacity: 0.45,
              }}
              transition={{ type: 'spring', stiffness: 55, damping: 16 }}
              style={{ filter: 'blur(3.5px)' }}
            />
            <motion.circle
              cx="50" cy="50" r={RING_RADIUS}
              fill="none"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              animate={{
                strokeDashoffset: RING_CIRCUMFERENCE * (1 - progress),
                stroke: arcColor,
              }}
              transition={{ type: 'spring', stiffness: 55, damping: 16 }}
            />
          </>
        )}
      </svg>

      {/* Orbe: capa cónica nítida, respiración con curva orgánica */}
      <motion.div
        animate={
          reduceMotion
            ? { scale: 1 }
            : { scale: isListening ? [1, 1.055, 1] : [1, 1.025, 1] }
        }
        transition={
          reduceMotion
            ? { duration: 0.3 }
            : {
                duration: isListening ? 1.15 : 4.4,
                repeat: Infinity,
                ease: 'easeInOut',
                times: BREATHE_TIMES,
              }
        }
        className="relative w-44 h-44 rounded-full overflow-hidden"
        role="status"
        aria-label={
          isListening ? 'Escuchando' : mode === 'translation' ? 'Traduciendo' : mode === 'evaluation' ? 'Evaluando' : 'En espera'
        }
        style={{
          boxShadow: active
            ? '0 0 72px rgba(139,156,249,0.36), 0 0 28px rgba(108,212,255,0.18), inset 0 0 30px rgba(255,255,255,0.07)'
            : '0 0 54px rgba(139,156,249,0.24), inset 0 0 30px rgba(255,255,255,0.05)',
          transition: 'box-shadow 0.9s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        <div
          className="orb-spin-layer orb-gradient absolute -inset-6"
          style={{
            animation: reduceMotion ? 'none' : `orb-spin ${spinDuration} linear infinite`,
            filter: 'blur(14px)',
          }}
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
            initial={{ scale: 0.4, y: 10, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.4, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="absolute -bottom-1 glass-deep rounded-full px-4 py-1.5"
            style={{
              borderColor: mastered ? `${GOLD}66` : `${scoreColor(score)}55`,
            }}
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
          animate={
            reduceMotion ? { opacity: 1 } : { opacity: 1, rotate: 360 }
          }
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
