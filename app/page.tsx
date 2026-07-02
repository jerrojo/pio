'use client';

import { useState, useEffect } from 'react';
import { TermsScreen } from '@/components/TermsScreen';
import { FaceIdLogin } from '@/components/FaceIdLogin';
import { SplashScreen } from '@/components/SplashScreen';
import { IntelligentConversation } from '@/components/IntelligentConversation';
import { LanguageCode } from '@/types';

type AppStage = 'terms' | 'faceid' | 'splash' | 'main' | 'lockout';

export default function App() {
  const [stage, setStage] = useState<AppStage>('terms');
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const [userLanguage, setUserLanguage] = useState<LanguageCode>('es');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');

  const handleAcceptTerms = () => {
    setHasAcceptedTerms(true);
    setStage('faceid');
    // In production: save to Supabase
  };

  const handleRejectTerms = () => {
    // Stay on terms screen
  };

  const handleFaceIdSuccess = () => {
    setStage('splash');
  };

  const handleFaceIdLockout = () => {
    setStage('lockout');
  };

  const handleSplashComplete = () => {
    setStage('main');
  };

  return (
    <>
      {stage === 'terms' && (
        <TermsScreen
          onAccept={handleAcceptTerms}
          onReject={handleRejectTerms}
        />
      )}

      {stage === 'faceid' && (
        <FaceIdLogin
          onSuccess={handleFaceIdSuccess}
          onLockout={handleFaceIdLockout}
        />
      )}

      {stage === 'splash' && (
        <SplashScreen
          onComplete={handleSplashComplete}
          userLanguage={userLanguage}
          targetLanguage={targetLanguage}
        />
      )}

      {stage === 'main' && (
        <IntelligentConversation
          userLanguage={userLanguage}
          targetLanguage={targetLanguage}
        />
      )}

      {stage === 'lockout' && (
        <div className="min-h-screen bg-red-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Cuenta Bloqueada
            </h2>
            <p className="text-gray-600">
              Contacta a soporte para desbloquear tu cuenta.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
