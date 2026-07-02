import { Language, LanguageCode } from '@/types';

export type { Language, LanguageCode };

export const LANGUAGES: Record<LanguageCode, Language> = {
  it: {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹',
    accent: 'Acento de Roma',
    voiceName: 'it-IT-Standard-A',
    locale: 'it-IT',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    accent: 'Acento de Madrid',
    voiceName: 'es-ES-Standard-A',
    locale: 'es-ES',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
  en: {
    code: 'en',
    name: 'Inglés',
    flag: '🇬🇧',
    accent: 'Londres / Wellington',
    voiceName: 'en-GB-Standard-A',
    locale: 'en-GB',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
  fr: {
    code: 'fr',
    name: 'Francés',
    flag: '🇫🇷',
    accent: 'París',
    voiceName: 'fr-FR-Standard-A',
    locale: 'fr-FR',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
  de: {
    code: 'de',
    name: 'Alemán',
    flag: '🇩🇪',
    accent: 'Berlín',
    voiceName: 'de-DE-Standard-A',
    locale: 'de-DE',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
  pt: {
    code: 'pt',
    name: 'Portugués',
    flag: '🇵🇹',
    accent: 'Portugal',
    voiceName: 'pt-PT-Standard-A',
    locale: 'pt-PT',
    elevenLabsVoiceId: '21m00Tcm4TlvDq8ikWAM',
  },
};

export const LANGUAGE_NAMES: Record<LanguageCode, string> = {
  it: 'Italiano',
  es: 'Español',
  en: 'Inglés',
  fr: 'Francés',
  de: 'Alemán',
  pt: 'Portugués',
};

export function getLanguage(code: LanguageCode): Language {
  return LANGUAGES[code];
}

export function getAllLanguages(): Language[] {
  return Object.values(LANGUAGES);
}
