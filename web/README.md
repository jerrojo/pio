# Pío web — reconstrucción activa

Aplicación nueva en Next.js 16, separada de la versión histórica del directorio superior. Interfaz y adaptadores implementados; **voz real pendiente de activación y validación**. Publicada para revisión en https://pio-rho.vercel.app. No se reemplazó `pio.today`. Ver [despliegue](../docs/DESPLIEGUE.md).

## Reglas del producto

- Primera visita: elegir idiomas. Visitas siguientes y «Nueva conversación»: conservar la última selección válida, incluidas las variantes regionales. No imponer español → alemán.
- Idioma nativo: traducir y pronunciar la traducción; convertirla en la referencia para repetir.
- Idioma objetivo con referencia: evaluar el audio y seguir corrigiendo hasta un resultado aceptable.
- Idioma objetivo sin referencia: evaluación acústica libre; corregir si es necesario y, cuando es aceptable, continuar la conversación.
- Si el idioma es ambiguo, pedir aclaración conservando el audio temporalmente en memoria.
- Error, falta de evidencia o silencio: no dar nota ni sumar progreso.
- Pausa, cambio de idioma, reinicio, salida de pestaña y desmontaje: detener pistas, reproducción y solicitudes; ignorar respuestas del turno anterior.

La interfaz explica las palabras a practicar y permite escucharlas. La evaluación sigue siendo de la frase completa: el ejercicio progresivo palabra → grupo → frase del diseño histórico aún requiere una fase propia. No afirmar que ese recorrido ya está implementado.

## Ejecutar

Node 22.19 o posterior. Desde esta carpeta:

```sh
npm ci
npm test
npm run typecheck
npm run dev
```

La aplicación abre en `http://127.0.0.1:3037`. Para compilación y ejecución de producción: `npm run build` y `npm start`. En un alojamiento futuro, seleccionar **`web` como directorio raíz**, no el proyecto histórico.

Si iCloud descarga las dependencias, usar el entorno de trabajo local preparado:

```sh
# Desde la raíz del repositorio
python3 scripts/sync-web-runtime.py
cd /private/tmp/pio-web-runtime
npm ci
npm run dev
```

El sincronizador copia fuentes, no credenciales ni dependencias. `/private/tmp` es temporal: la copia duradera del código es esta carpeta.

Detener el servidor de desarrollo antes de una sincronización amplia o una compilación de producción. La copia de cada archivo es atómica para evitar lecturas a medio escribir; el conjunto de archivos se sigue actualizando por pasos.

## Conexiones

Crear `.env.local` a partir de `.env.example` **solo con las cuentas autorizadas**. No pegar claves en el chat ni incluirlas en Git. Configurar también el entorno temporal si se usa; el sincronizador no copia secretos.

| Función | Adaptador implementado | Estado |
| --- | --- | --- |
| Transcripción y detección de idioma | ElevenLabs Scribe v2 | Sin prueba con cuenta real |
| Pronunciación hablada | ElevenLabs v4, Text to Dialogue REST | Sin voz nativa seleccionada ni audición comparativa |
| Evaluación de audio | Azure Speech SDK, con y sin referencia | Sin prueba real; umbrales provisionales |
| Traducción y conversación | OpenAI a través de AI SDK 7 | Sin prueba real |

`PIO_TEXT_MODEL` y `PIO_VOICE_MODEL` son configurables. v4 Turbo usa otra modalidad de transporte; no intercambiar el identificador sin implementar su WebSocket. Los identificadores de voz se configuran por variante. No hay cambio silencioso a una voz del navegador.

En producción se requiere `PIO_ACCESS_CODE` para el piloto privado. La limitación en memoria es una protección básica por instancia, **no** un límite distribuido ni una solución de autenticación pública. Antes de abrir registro: cuentas individuales, cuotas y límites distribuidos, controles de costes y política de retención confirmada por proveedor.

## Límites de la comprobación

Las pruebas automáticas usan proveedores controlados y respuestas sintéticas. Comprueban las decisiones y el tratamiento de errores, no la exactitud acústica ni la calidad de una traducción real. El corte por silencio, el ruido de televisión, los micrófonos físicos, los permisos y la reproducción de Safari/Chrome requieren el piloto descrito en `../docs/PLAN-DE-PRUEBAS.md`.

El progreso se guarda localmente por par y día, sin rachas punitivas. No hay sincronización entre dispositivos, cuenta pública, cola de repaso, exportación/importación o migración fiable del progreso antiguo. Las preferencias se actualizan entre pestañas mediante eventos de almacenamiento; el progreso no constituye una base de datos transaccional multiusuario.

`/qa` existe solo en desarrollo para revisar las vistas de 320 y 390 píxeles. Devuelve 404 en producción.

## Revisión de experiencia

El UX Skill entregado se aplicó a esta versión. Ver [revisión y evidencia](../docs/UX-REVISION.md). `/qa` contiene marcos de prueba y ejemplos claramente rotulados, sin llamadas de voz; devuelve 404 en producción. Los ejemplos visuales no constituyen evaluaciones de pronunciación.
