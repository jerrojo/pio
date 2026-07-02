'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, Lightbulb, Lock } from 'lucide-react';

interface FaceIdLoginProps {
  onSuccess: () => void;
  onLockout: () => void;
}

export function FaceIdLogin({ onSuccess, onLockout }: FaceIdLoginProps) {
  const [attempts, setAttempts] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const [isLockedOut, setIsLockedOut] = useState(false);

  const handleFaceScan = async () => {
    if (attempts >= 3) {
      setIsLockedOut(true);
      setTimeout(() => onLockout(), 2000);
      return;
    }

    setIsScanning(true);
    
    // Simulate FaceTec scan
    setTimeout(() => {
      setIsScanning(false);
      const success = Math.random() > 0.7; // Mock: 30% success rate for demo

      if (success) {
        onSuccess();
      } else {
        const newAttempts = attempts + 1;
        setAttempts(newAttempts);
        
        if (newAttempts === 2) {
          setShowTips(true);
        } else if (newAttempts >= 3) {
          setIsLockedOut(true);
          setTimeout(() => onLockout(), 2000);
        }
      }
    }, 2000);
  };

  const handleRetrain = () => {
    setAttempts(0);
    setShowTips(false);
  };

  if (isLockedOut) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-white flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center max-w-md"
        >
          <Lock className="w-16 h-16 mx-auto text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Cuenta Bloqueada Temporalmente</h2>
          <p className="text-gray-600 mb-6">
            Has superado el número máximo de intentos. Por favor, contacta a soporte para desbloquear tu cuenta.
          </p>
          <a
            href="https://wa.me/1234567890?text=Necesito ayuda con mi cuenta de Pío App"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-6 py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold transition-colors"
          >
            Contactar Soporte por WhatsApp
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md w-full"
      >
        <div className="relative mb-8">
          <motion.div
            animate={{
              scale: isScanning ? [1, 1.1, 1] : 1,
            }}
            transition={{
              duration: 2,
              repeat: isScanning ? Infinity : 0,
            }}
            className="w-32 h-32 mx-auto bg-primary-500 rounded-full flex items-center justify-center"
          >
            <svg className="w-20 h-20 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </motion.div>
          
          {attempts > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {attempts}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Face ID</h1>
        <p className="text-gray-600 mb-8">
          {attempts === 0 && 'Mira a la cámara para iniciar sesión'}
          {attempts === 1 && 'Intento fallido. Intenta de nuevo'}
          {attempts === 2 && 'Segundo intento fallido'}
        </p>

        {showTips && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-6 text-left"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="font-semibold text-yellow-900 mb-1">Consejos para mejor reconocimiento:</h3>
                <ul className="text-sm text-yellow-800 space-y-1">
                  <li>• Asegúrate de tener buena iluminación</li>
                  <li>• Quítate gafas de sol o sombreros</li>
                  <li>• Mantén el rostro frente a la cámara</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}

        {attempts === 2 && (
          <button
            onClick={handleRetrain}
            className="mb-4 text-primary-600 hover:text-primary-700 font-medium text-sm"
          >
            Re-entrenar Face ID
          </button>
        )}

        <button
          onClick={handleFaceScan}
          disabled={isScanning}
          className={`w-full px-6 py-4 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-white rounded-xl font-semibold transition-colors ${
            isScanning ? 'cursor-wait' : ''
          }`}
        >
          {isScanning ? 'Escaneando...' : attempts === 0 ? 'Iniciar Escaneo' : 'Intentar Nuevamente'}
        </button>
      </motion.div>
    </div>
  );
}


