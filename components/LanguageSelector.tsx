'use client';

import { useState } from 'react';
import { Language, LanguageCode } from '@/types';
import { getAllLanguages, getLanguage } from '@/lib/languages';
import { X } from 'lucide-react';

interface LanguageSelectorProps {
  selectedLanguage: LanguageCode;
  onLanguageChange: (language: LanguageCode) => void;
  showFullscreen?: boolean;
  onCloseFullscreen?: () => void;
}

export function LanguageSelector({ 
  selectedLanguage, 
  onLanguageChange,
  showFullscreen = false,
  onCloseFullscreen
}: LanguageSelectorProps) {
  const languages = getAllLanguages();

  const handleLanguageSelect = (code: LanguageCode) => {
    onLanguageChange(code);
    if (showFullscreen && onCloseFullscreen) {
      onCloseFullscreen();
    }
  };

  if (showFullscreen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Selecciona un idioma</h2>
            {onCloseFullscreen && (
              <button
                onClick={onCloseFullscreen}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`p-4 rounded-xl border-2 transition-all text-left hover:shadow-lg ${
                  selectedLanguage === lang.code
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 hover:border-primary-300'
                }`}
              >
                <div className="flex items-center gap-4">
                  <span className="text-4xl">{lang.flag}</span>
                  <div className="flex-1">
                    <div className="font-semibold text-lg text-gray-900">{lang.name}</div>
                    <div className="text-sm text-gray-600">{lang.accent}</div>
                  </div>
                  {selectedLanguage === lang.code && (
                    <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <select
        value={selectedLanguage}
        onChange={(e) => handleLanguageSelect(e.target.value as LanguageCode)}
        className="appearance-none bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-10 text-gray-900 font-medium cursor-pointer hover:border-primary-300 focus:outline-none focus:border-primary-500 transition-colors"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.name}
          </option>
        ))}
      </select>
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
        <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </div>
  );
}


