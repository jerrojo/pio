'use client';

import { Message, LanguageCode } from '@/types';
import { getLanguage } from '@/lib/languages';
import { Play, Volume2 } from 'lucide-react';
import { useState } from 'react';

interface MessageBubbleProps {
  message: Message;
  onPlayAudio?: (text: string, language: LanguageCode) => void;
}

export function MessageBubble({ message, onPlayAudio }: MessageBubbleProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = async () => {
    if (onPlayAudio) {
      setIsPlaying(true);
      await onPlayAudio(message.text, message.language);
      setIsPlaying(false);
    }
  };

  const handlePlayTranslation = async () => {
    if (onPlayAudio && message.translatedText) {
      setIsPlaying(true);
      await onPlayAudio(message.translatedText, message.translatedLanguage || message.language);
      setIsPlaying(false);
    }
  };

  return (
    <div className={`flex flex-col gap-2 ${message.isUser ? 'items-end' : 'items-start'}`}>
      <div
        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
          message.isUser
            ? 'bg-primary-500 text-white'
            : 'bg-gray-100 text-gray-900'
        }`}
      >
        <div className="flex items-start gap-2">
          <div className="flex-1">
            <p className="text-sm font-medium">{message.text}</p>
            {message.translatedText && (
              <div className="mt-2 pt-2 border-t border-opacity-20">
                <p className="text-xs opacity-90">{message.translatedText}</p>
                <span className="text-xs opacity-70">
                  ({getLanguage(message.translatedLanguage || message.language).name})
                </span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1">
            {onPlayAudio && (
              <>
                <button
                  onClick={handlePlayAudio}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                  disabled={isPlaying}
                >
                  <Volume2 className="w-4 h-4" />
                </button>
                {message.translatedText && (
                  <button
                    onClick={handlePlayTranslation}
                    className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                    disabled={isPlaying}
                  >
                    <Play className="w-4 h-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
      <span className="text-xs text-gray-500">
        {new Date(message.timestamp).toLocaleTimeString()}
      </span>
    </div>
  );
}


