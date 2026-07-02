'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';

interface TermsScreenProps {
  onAccept: () => void;
  onReject: () => void;
}

export function TermsScreen({ onAccept, onReject }: TermsScreenProps) {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 100) {
        setHasScrolled(true);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col">
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center py-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Términos y Condiciones</h1>
            <p className="text-gray-600">Por favor, lee y acepta nuestros términos antes de continuar</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6 text-gray-700">
            <section>
              <h2 className="text-2xl font-semibold mb-4">1. Aceptación de Términos</h2>
              <p className="leading-relaxed">
                Al usar Pío App, aceptas estos términos y condiciones. Si no estás de acuerdo, no uses la aplicación.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">2. Privacidad</h2>
              <p className="leading-relaxed">
                Tu privacidad es importante para nosotros. Toda la información biométrica se almacena de forma segura
                y solo se usa para autenticación. Tus conversaciones de aprendizaje se guardan localmente cuando es posible.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">3. Uso del Servicio</h2>
              <p className="leading-relaxed">
                Pío App es una herramienta educativa diseñada para ayudarte a aprender idiomas. No garantizamos
                resultados específicos y el uso es bajo tu propia responsabilidad.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">4. Datos Personales</h2>
              <p className="leading-relaxed">
                Recopilamos datos mínimos necesarios para proporcionar el servicio, incluyendo progreso de aprendizaje
                y preferencias de idioma. Puedes solicitar la eliminación de tus datos en cualquier momento.
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold mb-4">5. Limitación de Responsabilidad</h2>
              <p className="leading-relaxed">
                Pío App se proporciona "tal cual" sin garantías. No seremos responsables por ningún daño derivado
                del uso de la aplicación.
              </p>
            </section>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-6">
        <div className="max-w-3xl mx-auto flex gap-4">
          <button
            onClick={onReject}
            className="flex-1 px-6 py-4 bg-gray-100 hover:bg-gray-200 rounded-xl font-semibold text-gray-700 transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5" />
            Rechazar
          </button>
          <button
            onClick={onAccept}
            disabled={!hasScrolled}
            className={`flex-1 px-6 py-4 rounded-xl font-semibold text-white transition-colors flex items-center justify-center gap-2 ${
              hasScrolled
                ? 'bg-primary-500 hover:bg-primary-600'
                : 'bg-gray-300 cursor-not-allowed'
            }`}
          >
            <Check className="w-5 h-5" />
            Aceptar y Continuar
          </button>
        </div>
      </div>
    </div>
  );
}


