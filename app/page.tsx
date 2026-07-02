'use client';

import { useState } from 'react';
import { LanguagePairing } from '@/components/LanguagePairing';
import { IntelligentConversation } from '@/components/IntelligentConversation';
import { LanguageCode } from '@/types';

/**
 * Cero fricción: la app abre directo en la conversación (es → en por defecto)
 * y pide el micrófono automáticamente. El idioma se cambia desde el header.
 */
export default function App() {
  const [showLanguages, setShowLanguages] = useState(false);
  const [userLanguage, setUserLanguage] = useState<LanguageCode>('es');
  const [targetLanguage, setTargetLanguage] = useState<LanguageCode>('en');

  if (showLanguages) {
    return (
      <LanguagePairing
        initialNative={userLanguage}
        initialTarget={targetLanguage}
        onConfirm={(native, target) => {
          setUserLanguage(native);
          setTargetLanguage(target);
          setShowLanguages(false);
        }}
      />
    );
  }

  return (
    <IntelligentConversation
      key={`${userLanguage}-${targetLanguage}`}
      userLanguage={userLanguage}
      targetLanguage={targetLanguage}
      onChangeLanguages={() => setShowLanguages(true)}
    />
  );
}
