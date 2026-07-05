# Pío nativo (Expo)

App móvil de Pío: habla en tu idioma y Pío traduce; habla en el idioma que
aprendes y Pío evalúa tu pronunciación palabra por palabra. Consume el mismo
backend que la web (`https://www.pio.today`): no necesita claves ni `.env`.

## Arranque

Requisitos: Node 20+, un iPhone/Android con **Expo Go** instalado
(App Store / Play Store), y que el teléfono y el ordenador estén en la
misma red Wi-Fi.

```bash
cd native
npm install
npx expo start
```

Escanea el código QR que aparece en la terminal:

- **iPhone**: con la app Cámara (abre en Expo Go).
- **Android**: desde la propia app Expo Go.

La primera vez, acepta el permiso de micrófono cuando la app lo pida.

## Cómo se usa

1. Elige qué idioma hablas y cuál quieres aprender (se recuerda).
2. **Mantén presionado** el botón grande para hablar; **suelta** para enviar.
   - Hablas tu idioma → Pío traduce, muestra la frase y la dice en voz alta.
   - Hablas el idioma objetivo → Pío evalúa: verde/ámbar/rojo por palabra,
     y consejo del coach si fallas.
3. Meta diaria: 3 frases dominadas. El progreso y el repaso espaciado viven
   en el dispositivo (AsyncStorage).

## Decisiones de la v1

- **Push-to-talk, no manos libres**: el VAD (detección de voz) llega después.
- **Voz del sistema** (expo-speech), gratis y offline. ElevenLabs, después.
- Grabación con expo-av (m4a) → `POST /api/speech-to-text` con la misma
  lógica de intents que la web (el servidor decide traducir vs. evaluar).

## Estructura

```
native/
  App.tsx                 # raíz: par de idiomas persistido → pantalla
  screens/
    LanguagePairing.tsx   # "Yo hablo" + tarjetas de idioma objetivo
    Conversation.tsx      # orbe, push-to-talk, tarjetas de feedback
  components/Orb.tsx      # orbe con gradiente que respira (Animated)
  lib/
    api.ts                # cliente del backend de www.pio.today
    tts.ts                # expo-speech con timeout de seguridad
    i18n.ts               # copia de la web + claves del push-to-talk
    languages.ts, types.ts# copiados de la web
    progress.ts, review.ts# misma lógica, AsyncStorage (async)
    theme.ts              # tokens: #05060a, hairlines, iris #8b9cf9
```
