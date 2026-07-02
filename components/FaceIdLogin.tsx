'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lightbulb, Lock, ScanFace } from 'lucide-react';

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

    // Mock FaceTec: 85% de éxito (el SDK real reemplaza esto)
    setTimeout(() => {
      setIsScanning(false);
      const success = Math.random() > 0.15;

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
    }, 1800);
  };

  const handleRetrain = () => {
    setAttempts(0);
    setShowTips(false);
  };

  if (isLockedOut) {
    return (
      <div className="min-h-dvh flex items-center justify-center px-6">
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="glass rounded-3xl p-10 text-center max-w-md"
        >
          <Lock className="w-14 h-14 mx-auto text-red-400 mb-4" />
          <h2 className="text-2xl font-medium tracking-tight text-white mb-2">
            Cuenta Bloqueada Temporalmente
          </h2>
          <p className="text-slate-400 mb-6">
            Has superado el número máximo de intentos. Contacta a soporte para
            desbloquear tu cuenta.
          </p>
          <a
            href="https://wa.me/1234567890?text=Necesito ayuda con mi cuenta de Pío App"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary inline-block px-6 py-3"
          >
            Contactar Soporte por WhatsApp
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="text-center max-w-md w-full"
      >
        <div className="relative mb-8 inline-block">
          {/* anillo de escaneo */}
          {isScanning && (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
              className="absolute -inset-3 rounded-full border-2 border-transparent border-t-[#8b9cf9] border-r-[#6cd4ff]/40"
            />
          )}
          <motion.div
            animate={{ scale: isScanning ? [1, 1.05, 1] : 1 }}
            transition={{ duration: 1.6, repeat: isScanning ? Infinity : 0 }}
            className="w-32 h-32 mx-auto rounded-full glass flex items-center justify-center"
            style={{ boxShadow: isScanning ? '0 0 50px 8px rgba(139,156,249,0.3)' : undefined }}
          >
            <ScanFace className={`w-16 h-16 ${isScanning ? 'text-[#8b9cf9]' : 'text-slate-300'}`} />
          </motion.div>

          {attempts > 0 && (
            <div className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {attempts}
            </div>
          )}
        </div>

        <h1 className="text-3xl font-medium tracking-tight text-white mb-2">Face ID</h1>
        <p className="text-slate-400 mb-8">
          {attempts === 0 && 'Mira a la cámara para iniciar sesión'}
          {attempts === 1 && 'Intento fallido. Intenta de nuevo'}
          {attempts === 2 && 'Segundo intento fallido'}
        </p>

        {showTips && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-2xl p-4 mb-6 text-left"
          >
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-amber-300 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-semibold text-white mb-1 text-sm">
                  Consejos para mejor reconocimiento:
                </h3>
                <ul className="text-sm text-slate-300 space-y-1">
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
            className="mb-4 text-[#8b9cf9] hover:text-[#a9b6fb] font-medium text-sm"
          >
            Re-entrenar Face ID
          </button>
        )}

        <button
          onClick={handleFaceScan}
          disabled={isScanning}
          className="btn-primary w-full px-6 py-4"
        >
          {isScanning ? 'Escaneando…' : attempts === 0 ? 'Iniciar Escaneo' : 'Intentar Nuevamente'}
        </button>
      </motion.div>
    </div>
  );
}
