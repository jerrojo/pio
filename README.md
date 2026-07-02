# Pío App

Una app para aprender lenguajes de una manera natural y simple con inteligencia artificial, reconocimiento facial y evaluación fonética en tiempo real.

## 🚀 Características Principales

### 1. Login Flow
- ✅ Términos y Condiciones con aceptación obligatoria
- ✅ Face ID Login con FaceTec (3 intentos, re-entrenamiento, bloqueo temporal)
- ✅ Splash screen con animación Pixar-style (3.8s)

### 2. Sistema de Aprendizaje Inteligente
- 🎤 **Detección Automática de Idioma**: Usa Whisper/Vosk para detectar el idioma hablado
- 🌍 **Modo Traducción**: Traduce automáticamente cuando el usuario habla en su idioma nativo
- 🎯 **Modo Evaluación**: Evalúa pronunciación cuando el usuario habla en el idioma objetivo
- 📊 **Evaluación Fonética**: Scoring 0-10 con umbral de repetición ≥ 7/10
- ⏭️ **Skip Class**: Permite continuar la conversación sin interrupciones

### 3. Feedback Visual en Tiempo Real
- **Cyan Pulse**: Modo detección
- **Lime Glow**: Modo traducción
- **Red → Yellow → Green**: Modo evaluación según score
- **Gold Ring**: Celebración cuando se alcanza ≥ 7/10
- Animaciones suaves y transiciones fluidas

### 4. Tecnologías Integradas
- **Supabase**: Autenticación, perfiles y progreso
- **ElevenLabs**: Text-to-speech con voz neutral femenina (21 años)
- **OpenAI GPT-4**: Generación de respuestas naturales
- **Whisper/Vosk**: Reconocimiento de voz y detección de idioma

## 📋 Requisitos Previos

- Node.js 18+ 
- npm o yarn
- Cuentas de servicio para:
  - Supabase (backend y auth)
  - ElevenLabs (TTS)
  - OpenAI (GPT-4)
  - Google Translate (opcional)

## 🔧 Configuración

1. **Instala las dependencias:**
```bash
npm install
```

2. **Crea un archivo `.env.local` con tus API keys:**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_supabase_anon_key

# ElevenLabs (TTS)
ELEVENLABS_API_KEY=tu_elevenlabs_api_key

# OpenAI (GPT-4)
OPENAI_API_KEY=tu_openai_api_key

# Google Translate (opcional)
GOOGLE_TRANSLATE_API_KEY=tu_google_translate_key
```

3. **Configura Supabase:**
   - Crea una tabla `profiles` con los campos:
     - `id` (uuid, primary key)
     - `email` (text)
     - `faceId_enrolled` (boolean)
     - `terms_accepted` (boolean)
     - `terms_accepted_at` (timestamp)
     - `target_language` (text)
     - `native_language` (text)
     - `progress` (jsonb)
     - `created_at` (timestamp)
     - `updated_at` (timestamp)

4. **Ejecuta el servidor de desarrollo:**
```bash
npm run dev
```

5. **Abre [http://localhost:3000](http://localhost:3000) en tu navegador.**

## 🌍 Idiomas Soportados

- 🇮🇹 Italiano (Acento de Roma)
- 🇪🇸 Español (Acento de Madrid)
- 🇬🇧 Inglés (Londres / Wellington)
- 🇫🇷 Francés (París)
- 🇩🇪 Alemán (Berlín)
- 🇵🇹 Portugués (Portugal)

## 🎯 Flujo de la Aplicación

1. **Términos y Condiciones**: Usuario debe leer y aceptar
2. **Face ID Login**: 3 intentos con opciones de re-entrenamiento
3. **Splash Screen**: Animación de 3.8s mientras carga assets
4. **Conversación Inteligente**:
   - Usuario habla libremente
   - AI detecta el idioma automáticamente
   - Si es idioma nativo → Modo Traducción
   - Si es idioma objetivo → Modo Evaluación
   - Scoring fonético en tiempo real
   - Sistema de repetición hasta ≥ 7/10
   - Opción "Skip Class" siempre disponible

## 📊 Métricas de Rendimiento

| Métrica | Objetivo |
|---------|----------|
| Latencia de detección | < 800 ms |
| Traducción + TTS | < 1.5 s |
| Feedback de evaluación | < 700 ms |
| Pase de pronunciación | ≥ 7/10 |
| Respuesta Skip Class | < 200 ms |

## 🛠️ Estructura del Proyecto

```
PÍO/
├── app/
│   ├── api/
│   │   ├── translate/route.ts          # Google Translate
│   │   ├── agent-response/route.ts      # OpenAI GPT-4
│   │   ├── elevenlabs-tts/route.ts     # ElevenLabs TTS
│   │   ├── evaluate-pronunciation/route.ts  # Phoneme scoring
│   │   ├── detect-language/route.ts    # Language detection
│   │   └── speech-to-text/route.ts     # STT fallback
│   ├── page.tsx                         # Main app entry
│   ├── layout.tsx
│   └── globals.css
├── components/
│   ├── TermsScreen.tsx                  # Terms acceptance
│   ├── FaceIdLogin.tsx                  # Face ID authentication
│   ├── SplashScreen.tsx                 # Loading animation
│   ├── IntelligentConversation.tsx      # Main conversation UI
│   ├── VoiceRecorder.tsx                # Voice input
│   ├── LanguageSelector.tsx             # Language picker
│   └── MessageBubble.tsx                # Chat bubbles
├── lib/
│   ├── languages.ts                     # Language config
│   ├── supabase.ts                      # Supabase client
│   ├── pronunciation.ts                 # Scoring logic
│   ├── agent.ts                         # AI responses
│   └── conversationStore.ts             # Conversation memory
└── types/
    └── index.ts                         # TypeScript types
```

## 🔒 Privacidad y Seguridad

- Los datos biométricos se almacenan de forma segura en Supabase
- Las conversaciones se guardan localmente cuando es posible
- El usuario puede solicitar eliminación de datos en cualquier momento
- Cumplimiento con GDPR y normativas de privacidad

## 🚧 Próximas Mejoras

- [ ] Integración completa con FaceTec SDK
- [ ] Modelo ML para evaluación fonética precisa
- [ ] Modo Flow (conversación hands-free)
- [ ] Micro-Misiones diarias
- [ ] Voice Tone Mirror (adaptación emocional)
- [ ] Indicador de privacidad (on-device vs cloud)
- [ ] Optimización con Supabase Edge Functions

## 📝 Notas

- La app usa Web Speech API del navegador como fallback
- Para producción, se recomienda usar servicios cloud como Google Cloud Speech-to-Text
- El sistema de scoring fonético actual es un mock; en producción requiere modelo ML
- FaceTec SDK requiere configuración adicional para producción

## 📄 Licencia

Todos los derechos reservados © 2024 Pío App

