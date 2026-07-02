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
    elevenLabsVoiceId: 'cgSgspJ2msm6clMCkdW9',
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸',
    accent: 'Acento de Madrid',
    voiceName: 'es-ES-Standard-A',
    locale: 'es-ES',
    elevenLabsVoiceId: 'EXAVITQu4vr4xnSDxMaL',
  },
  en: {
    code: 'en',
    name: 'Inglés',
    flag: '🇬🇧',
    accent: 'Londres / Wellington',
    voiceName: 'en-GB-Standard-A',
    locale: 'en-GB',
    elevenLabsVoiceId: 'Xb7hH8MSUJpSbSDYk0k2',
  },
  fr: {
    code: 'fr',
    name: 'Francés',
    flag: '🇫🇷',
    accent: 'París',
    voiceName: 'fr-FR-Standard-A',
    locale: 'fr-FR',
    elevenLabsVoiceId: 'pFZP5JQG7iQjIQuC4Bku',
  },
  de: {
    code: 'de',
    name: 'Alemán',
    flag: '🇩🇪',
    accent: 'Berlín',
    voiceName: 'de-DE-Standard-A',
    locale: 'de-DE',
    elevenLabsVoiceId: 'XrExE9yKIg1WjnnlVkGX',
  },
  pt: {
    code: 'pt',
    name: 'Portugués',
    flag: '🇵🇹',
    accent: 'Portugal',
    voiceName: 'pt-PT-Standard-A',
    locale: 'pt-PT',
    elevenLabsVoiceId: 'hpp4J3VqNfWAUOO0d1Us',
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
