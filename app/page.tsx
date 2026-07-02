'use client';

import { useState } from 'react';
import { LanguagePairing } from '@/components/LanguagePairing';
import { IntelligentConversation } from '@/components/IntelligentConversation';
import { LanguageCode } from '@/types';

type AppStage = 'languages' | 'main';

/**
 * Sin fricción de entrada: la app abre directo en la elección de idioma
 * (un tap + Empezar) y de ahí a la conversación. Términos, Face ID y
 * splash quedan fuera del flujo (los componentes siguen en /components
 * por si se necesitan al integrar auth real).
 */
export default function App() {
  const [stage, setStage] = useState<AppStage>('languages');
  const [userLanguage, setUserLanguage] = useState<LanguageCode>('es');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');

  return (
    <>
      {stage === 'languages' && (
        <LanguagePairing
          initialNative={userLanguage}
          initialTarget={targetLanguage}
          onConfirm={(native, target) => {
            setUserLanguage(native);
            setTargetLanguage(target);
            setStage('main');
          }}
        />
      )}

      {stage === 'main' && (
        <IntelligentConversation
          userLanguage={userLanguage}
          targetLanguage={targetLanguage}
          onChangeLanguages={() => setStage('languages')}
        />
      )}
    </>
  );
}
