# Selección de voz para Pío

Revisión: 30 de octubre de 2026. Ningún proveedor se declara «el mejor» sin comparar la experiencia completa con grabaciones y hablantes reales.

## Decisión para la primera integración

Separar reconocimiento, evaluación acústica, traducción y voz. Una conversación natural no demuestra que el sistema detecte un fonema mal pronunciado. La lógica de aprobación se mantiene fuera del modelo conversacional y exige resultados acústicos válidos.

| Candidato | Evidencia consultada | Decisión |
| --- | --- | --- |
| Block Dessa | La página oficial muestra un modelo de conversación basado en audio y acceso temprano para un pequeño grupo de investigadores de seguridad. No se encontró allí una API pública para integrar hoy. | Seguir como candidato de investigación. No depender de él para reiniciar Pío. |
| ElevenLabs | Scribe v2 para reconocimiento; v4 para síntesis; v4 Turbo para conversación en tiempo real mediante el transporte documentado. La cuenta del usuario muestra v4 y acceso a la consola. | Adaptadores de Scribe v2 y v4 REST implementados. Falta activar acceso dedicado, seleccionar voces y medir latencia/calidad. |
| Cartesia | Sonic 3.6 admite español, alemán y los otros idiomas de Pío; ofrece una versión fechada para evaluaciones reproducibles. | Candidato para comparación de voz y latencia. No está integrado ni se ha probado en esta cuenta. |
| Azure Speech | Evaluación de pronunciación por audio, con referencia y libre. La evaluación libre no tiene completitud respecto a un texto. Algunas capacidades fonéticas y de prosodia tienen restricciones por idioma. | Adaptador de evaluación implementado. No generar diagnósticos fonéticos no disponibles en alemán ni inventar completitud para habla libre. |
| OpenAI | Modelo de texto a través de AI SDK para traducción y respuesta conversacional. | Mantener la decisión acústica fuera del modelo. La versión configurada es una base de evaluación, no una declaración de superioridad. |

La latencia de inferencia publicada por un proveedor no incluye automáticamente carga del audio, detección del final del turno, red, evaluación y reproducción. Pío necesita medir p50/p95 del recorrido completo. Esta implementación procesa cada frase; todavía no es un sistema de conversación simultánea de baja latencia.

## Estado de cuentas observado

- ElevenLabs: sesión accesible, plan gratuito, consola con 10,000 créditos por periodo y 0 usados en la vista consultada. Hay tres claves de otras herramientas; no se recuperaron sus valores ni se modificaron.
- Se preparó el formulario de «Pio web · piloto»: voz y transcripción, lectura de voces/modelos, límite de 1,000 créditos y 30 días. **El usuario pidió dejarlo preparado sin crear. No existe una nueva clave creada por este trabajo.**
- OpenAI y Azure: las páginas visitadas solicitaron inicio de sesión. Esto no demuestra ausencia de cuentas o recursos; solo que no había sesión utilizable en ese navegador.
- Vercel: 17 proyectos en el equipo conectado; Pío no aparece. Las integraciones listadas no proporcionaron una conexión de voz para este proyecto.
- No se encontraron archivos de variables de entorno en las copias de Pío revisadas. No se buscaron ni reutilizaron secretos de proyectos ajenos.

## Fuentes primarias

- [Block: Dessa](https://block.xyz/dessa) — página oficial consultada directamente; acceso temprano descrito en la sección para investigadores.
- [ElevenLabs: modelos](https://elevenlabs.io/docs/overview/models/), [crear diálogo](https://elevenlabs.io/docs/api-reference/text-to-dialogue/convert), [metodología de latencia](https://elevenlabs.io/docs/eleven-api/concepts/latency-methodology).
- [Cartesia: Sonic](https://docs.cartesia.ai/build-with-cartesia/tts-models/latest).
- [Microsoft: evaluación de pronunciación](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment), [idiomas admitidos](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support?tabs=pronunciation-assessment).
- [OpenAI: GPT-5.4 mini](https://developers.openai.com/api/docs/models/gpt-5.4-mini). API de generación estructurada contrastada con la documentación incluida en AI SDK 7.0.157.
