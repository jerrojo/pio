# Configuración de Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# ElevenLabs API (for Text-to-Speech)
ELEVENLABS_API_KEY=your_elevenlabs_api_key

# OpenAI API (for GPT-4 agent responses)
OPENAI_API_KEY=your_openai_api_key

# Google Translate API (optional - for translation)
GOOGLE_TRANSLATE_API_KEY=your_google_translate_api_key
```

## Notas de Instalación

Si encuentras problemas de permisos con npm, ejecuta:

```bash
sudo chown -R $(whoami) ~/.npm
```

Luego instala las dependencias:

```bash
npm install
```

## FaceTec SDK

FaceTec SDK requiere:
1. Licencia comercial de FaceTec
2. SDK descargado desde el portal de FaceTec
3. Configuración manual en el proyecto

El código actual incluye un mock que simula el comportamiento. Para producción, reemplaza el código en `components/FaceIdLogin.tsx` con la integración real del SDK.


