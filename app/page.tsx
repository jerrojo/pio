'use client';

import { useState } from 'react';
import { TermsScreen } from '@/components/TermsScreen';
import { FaceIdLogin } from '@/components/FaceIdLogin';
import { SplashScreen } from '@/components/SplashScreen';
import { LanguagePairing } from '@/components/LanguagePairing';
import { IntelligentConversation } from '@/components/IntelligentConversation';
import { LanguageCode } from '@/types';

type AppStage = 'terms' | 'faceid' | 'languages' | 'splash' | 'main' | 'lockout';

export default function App() {
  const [stage, setStage] = useState<AppStage>('terms');
  const [userLanguage, setUserLanguage] = useState<LanguageCode>('es');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');

  return (
    <>
      {stage === 'terms' && (
        <TermsScreen
          onAccept={() => setStage('faceid')}
          onReject={() => {}}
        />
      )}

      {stage === 'faceid' && (
        <FaceIdLogin
          onSuccess={() => setStage('languages')}
          onLockout={() => setStage('lockout')}
        />
      )}

      {stage === 'languages' && (
        <LanguagePairing
          initialNative={userLanguage}
          initialTarget={targetLanguage}
          onConfirm={(native, target) => {
            setUserLanguage(native);
            setTargetLanguage(target);
            setStage('splash');
          }}
        />
      )}

      {stage === 'splash' && (
        <SplashScreen
          onComplete={() => setStage('main')}
          userLanguage={userLanguage}
          targetLanguage={targetLanguage}
        />
      )}

      {stage === 'main' && (
        <IntelligentConversation
          userLanguage={userLanguage}
          targetLanguage={targetLanguage}
          onChangeLanguages={() => setStage('languages')}
        />
      )}

      {stage === 'lockout' && (
        <div className="min-h-dvh flex items-center justify-center px-6">
          <div className="glass rounded-3xl p-10 text-center max-w-md">
            <h2 className="text-2xl font-medium tracking-tight text-white mb-3">Cuenta bloqueada</h2>
            <p className="text-slate-400">
              Contacta a soporte para desbloquear tu cuenta.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
