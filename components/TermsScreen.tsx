'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface TermsScreenProps {
  onAccept: () => void;
  onReject: () => void;
}

const SECTIONS = [
  {
    title: '1. Aceptación de Términos',
    body: 'Al usar Pío App, aceptas estos términos y condiciones. Si no estás de acuerdo, no uses la aplicación.',
  },
  {
    title: '2. Privacidad',
    body: 'Tu privacidad es importante para nosotros. Toda la información biométrica se almacena de forma segura y solo se usa para autenticación. Tus conversaciones de aprendizaje se guardan localmente cuando es posible.',
  },
  {
    title: '3. Uso del Servicio',
    body: 'Pío App es una herramienta educativa diseñada para ayudarte a aprender idiomas. No garantizamos resultados específicos y el uso es bajo tu propia responsabilidad.',
  },
  {
    title: '4. Datos Personales',
    body: 'Recopilamos datos mínimos necesarios para proporcionar el servicio, incluyendo progreso de aprendizaje y preferencias de idioma. Puedes solicitar la eliminación de tus datos en cualquier momento.',
  },
  {
    title: '5. Limitación de Responsabilidad',
    body: 'Pío App se proporciona "tal cual" sin garantías. No seremos responsables por ningún daño derivado del uso de la aplicación.',
  },
];

export function TermsScreen({ onAccept, onReject }: TermsScreenProps) {
  const [canAccept, setCanAccept] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Habilita "Aceptar" al llegar al final del contenedor (o si no hay overflow)
  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 48;
    if (atBottom) setCanAccept(true);
  }, []);

  useEffect(() => {
    checkScroll();
  }, [checkScroll]);

  return (
    <div className="h-dvh flex flex-col">
      <div className="text-center px-6 pt-10 pb-6">
        <span className="mx-auto block w-3 h-3 rounded-full orb-gradient" aria-hidden />
        <h1 className="text-3xl font-medium tracking-tight text-white mt-4">Términos y condiciones</h1>
        <p className="text-slate-500 mt-1 text-sm">
          Léelos hasta el final para continuar
        </p>
      </div>

      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex-1 overflow-y-auto px-6 pb-6"
      >
        <div className="max-w-2xl mx-auto glass rounded-3xl p-6 sm:p-8 space-y-6">
          {SECTIONS.map((s, i) => (
            <motion.section
              key={s.title}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 * i }}
            >
              <h2 className="text-lg font-semibold text-white mb-2">{s.title}</h2>
              <p className="text-slate-300 leading-relaxed text-sm">{s.body}</p>
            </motion.section>
          ))}
        </div>
      </div>

      <div className="px-6 py-5 border-t border-white/10 glass-deep">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={onReject}
            className="btn-ghost flex-1 px-6 py-4 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Rechazar
          </button>
          <button
            onClick={onAccept}
            disabled={!canAccept}
            className="btn-primary flex-1 px-6 py-4 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {canAccept ? 'Aceptar y continuar' : 'Desliza hasta el final'}
          </button>
        </div>
      </div>
    </div>
  );
}
