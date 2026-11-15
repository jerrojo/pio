# Pío investigación y reinicio web

Actualizado el 30 de octubre de 2026. **Plataforma: navegador en celular y computadora. La app restaura el último par elegido; español → alemán es un caso inicial de prueba, no un valor obligatorio.**

Pío se puede recuperar. El código sigue en GitHub y existen dos ubicaciones locales con trabajo adicional. La web pública ya no tiene un despliegue disponible. El reinicio debe recuperar la experiencia de aprender hablando y sustituir las partes que simulaban certeza, ocultaban errores o mezclaban los turnos de voz.

La investigación, una nueva aplicación web en `web/` y sus adaptadores de proveedores están implementados. Véase [Estado de la reconstrucción](docs/REINICIO-WEB.md). **La nueva app todavía no está conectada a servicios de voz ni lista para usar.** No se ha publicado una versión nueva. Las pruebas automáticas actuales verifican reglas y errores controlados; falta validar grabación, reproducción y evaluación con audio real.

## Dónde quedó

- **Código web publicado en GitHub:** [jerrojo/pio](https://github.com/jerrojo/pio). Último commit de `main`: [`0b56f06`](https://github.com/jerrojo/pio/commit/0b56f06e61c59c6d4690fe6b6f30e1313757137a), 7 de julio de 2026. Se recuperaron 43 commits y 67 archivos versionados. Incluye web Next.js y una primera carpeta nativa.
- **Carpeta original:** `/Users/jerovargas/Desktop/Projects/Active/apphouse.ai/PÍO`. Su HEAD local es `cda1a06`, del 6 de julio, anterior al último commit remoto. Tiene cambios locales en seis archivos nativos que no estaban en `main`, además de un diagnóstico del 15 de julio.
- **Otra copia nativa:** `/Users/jerovargas/PioNative`. Incluye la migración a `expo-audio`; su pantalla de conversación difiere de la copia del escritorio. No es un repositorio independiente: ejecutar Git allí resuelve el repositorio de la carpeta personal, asociado a otro proyecto. No usarlo para subir Pío.
- **Copia de trabajo para este reinicio:** `/Users/jerovargas/Documents/ChatGPT/APPS/pio`, rama `codex/pio-reinicio-web`, creada desde el `main` recuperado. Los cambios son locales; no se ha enviado esta rama a GitHub.
- **Rescate local adicional:** `/Users/jerovargas/Documents/ChatGPT/APPS/pio-recuperacion-local`. Conserva once archivos de las variantes locales, con un manifiesto y huellas SHA-256. Es un rescate selectivo de documentos y cambios relevantes, no una imagen completa de ambos directorios.

**Estado público comprobado:** `https://pio.today` y `https://www.pio.today` respondieron HTTP 404 con `x-vercel-error: DEPLOYMENT_NOT_FOUND` el 30 de octubre de 2026 a las 07:44, hora de Ciudad de México. El proyecto `pio` y su identificador guardado en `.vercel/project.json` devolvieron 404 en el equipo conectado. Tampoco aparecen entre los 17 proyectos listados en ese equipo. Esto confirma que el despliegue anterior no está disponible en ese ámbito; no permite establecer cuándo ni por qué se eliminó, ni descartar otra cuenta.

## Cómo se llegó a este punto

**2 y 3 de julio:** se simplificó la entrada, se construyó el ciclo de voz automático y se corrigieron problemas de idioma, palabras cortas, omisiones y ejercicios. Se añadió el orbe, el estilo visual contenido, los seis idiomas y el progreso sin rachas.

**5 al 7 de julio:** apareció la versión nativa. Su incorporación rompió temporalmente la compilación web al incluirse en la comprobación de tipos; después se separó. Se añadieron mecanismos contra eco, alternativas de voz y metadatos de PWA. La última versión de GitHub es del 7 de julio.

**15 de julio:** el diagnóstico local afirmaba que la web funcionaba y que la versión nativa nunca había completado un ciclo de voz en el teléfono. Describía el fallo entre grabación, subida y transcripción; la causa concreta seguía siendo una hipótesis. Ese estado histórico no prueba funcionamiento actual.

**30 de octubre:** se confirmó la caída de los dominios, se recuperó el código y se reprodujeron errores lógicos de la versión anterior. El reinicio se orientó a web. El usuario aclaró después que siempre debe respetarse su última selección de idiomas.

## Qué quería hacer Pío

Una experiencia de aprendizaje oral sencilla: el alumno dice algo en su idioma nativo, Pío lo traduce y lo pronuncia en el idioma elegido, el alumno lo intenta y recibe una corrección útil. Una frase difícil se trabaja por palabras y vuelve a la frase completa. Se puede cambiar de idea y pedir otra traducción sin quedarse encerrado en un ejercicio. El progreso suma; faltar un día no genera castigo.

El aspecto visual sirve al aprendizaje: orbe como centro, estados comprensibles y colores con significado. La recuperación del historial indica que la escucha automática era parte de la intención original. Se mantiene como objetivo, con un inicio explícito y una alternativa manual para recuperar situaciones difíciles.

## Fallos encontrados en la versión anterior

**La nota no medía fonemas.** `lib/server/scoring.ts` compara texto transcrito mediante distancia de edición y devuelve `phonemes: []`. El modelo de explicación recibe dos textos, no el audio. Puede dar una sugerencia de pronunciación, pero no verificar qué sonido produjo realmente el alumno. La reconstrucción debe medir el audio y distinguir una sugerencia general de un error acústico observado.

**Aprobación por comparación consigo misma.** Cuando no hay frase previa, `IntelligentConversation.tsx:343` utiliza `translatedRef.current || userText` como referencia. Con la misma frase a ambos lados, el evaluador devuelve 10 y aprobado. Se reprodujo con «Ich liebe dich», sin usar ningún audio.

**Errores disfrazados de resultados.** `lib/agent.ts` devuelve el texto original si falla la traducción. `lib/pronunciation.ts` devuelve una nota de 6 si falla la llamada. Se reprodujeron ambos comportamientos con una desconexión controlada. En el ejercicio de palabras, una nota de 6 podía además avanzar de etapa.

**Protección contra eco demasiado amplia.** El cliente descarta una transcripción igual a lo que Pío acaba de decir durante 2,5 segundos. Esa condición también puede cumplirse cuando el alumno repite correctamente una palabra corta. Es un riesgo demostrado por la condición del código; su frecuencia acústica requiere pruebas reales.

**Estado difícil de controlar.** El componente principal tiene 943 líneas y la escucha automática otras 359. Hay múltiples estados, referencias, temporizadores y llamadas asíncronas que afectan al mismo turno. Esa estructura exige cancelar resultados tardíos explícitamente. La nueva aplicación incorpora identidad de turno, pausa y reinicio conectados a los controles de audio y solicitudes; falta su validación con micrófonos y servicios reales.

**Progreso y repaso frágiles.** Tres registros de la misma frase producen una sola frase dominada pero `todayCount: 3`. El día usa UTC y las claves de progreso/repaso no separan idiomas. Los errores de almacenamiento se silencian. La nueva lógica separa la variante y el día local, y hace idempotente cada intento; la persistencia duradera y su migración todavía faltan.

**Documentación y operación desfasadas.** README y STATUS anuncian Face ID, Supabase y rutas que ya no están en el árbol recuperado. No hay suite de pruebas ni configuración de CI en el commit anterior. Los endpoints de voz no muestran autenticación de sesión, límites de uso ni límites explícitos de tamaño/duración en sus handlers; antes de exponer servicios de pago deben implementarse y verificarse. No se evaluó si existían controles externos históricos en Vercel.

**Dependencias que requieren renovación.** La copia usa Next 14.2.35. La consulta actual de `npm audit --omit=dev` reportó siete paquetes afectados: uno crítico, cinco altos y uno moderado. Son avisos de dependencias, no prueba de explotación del despliegue de Pío. La nueva entrega necesita una base mantenida y una revisión de compatibilidad; no basta con volver a publicar el código de julio.

**Credencial en la configuración antigua.** La URL remota de la copia del escritorio contenía un token de GitHub y la inspección lo mostró en su salida. La URL local se limpió y se verificó que apunta al mismo repositorio sin credenciales. El token no se reprodujo en este documento ni se copió al repositorio recuperado. Debe revocarse desde la cuenta de GitHub; retirarlo de una URL local no lo revoca.

Los resultados reproducibles están en [legacy-behavior.json](docs/evidence/legacy-behavior.json) y [dependency-audit.json](docs/evidence/dependency-audit.json). El script de reproducción usa memoria aislada y errores simulados; no lee conversaciones ni llama a proveedores.

## Cómo reconstruirla

### Primero demostrar un ciclo completo de español a alemán

«Te quiero» → «Ich liebe dich» → audio alemán → intento del alumno → corrección basada en esa grabación → repetición → progreso guardado. Probar también «ich», «dich», una frase con una palabra omitida y una con una “h” aspirada. El criterio de salida es completar ciclos reales en Safari de iPhone y Chrome de computadora, no solo obtener respuestas HTTP.

La evaluación acústica candidata es Azure Speech Pronunciation Assessment: su documentación incluye `de-DE` y puntuaciones de precisión, fluidez y completitud. La selección se confirma con grabaciones de prueba; no se debe prometer en alemán el mismo detalle de nombres de fonemas o prosodia que en inglés estadounidense. [Documentación oficial](https://learn.microsoft.com/en-us/azure/ai-services/speech-service/how-to-pronunciation-assessment).

### Separar responsabilidades

1. **Interfaz:** elegir idiomas, comprender el estado, escuchar, repetir, pedir ayuda y continuar.
2. **Audio:** permisos, captura, formato, inicio/fin de voz, reproducción, cancelación, cambios de dispositivo y segundo plano.
3. **Sesión:** un turno activo, una referencia vigente y resultados ligados al intento correspondiente.
4. **Servicios:** transcripción, traducción, evaluación acústica y voz mediante adaptadores con tiempo límite, validación y errores tipados. Las claves permanecen en el servidor.
5. **Aprendizaje y datos:** progreso por idioma, repaso, almacenamiento transaccional, exportación y migraciones. La sincronización entre dispositivos es una fase explícita.

### Construir por entregas verificables

**Entrega 0 — recuperada e iniciada.** Código e historial localizados; copia de cambios locales; diagnóstico; alcance; núcleo nuevo con pruebas. El núcleo aún no reemplaza la interfaz antigua.

**Entrega 1 — audio y evaluación real.** Renovar dependencias; configurar un entorno de prueba; integrar captura/reproducción y los proveedores; ejecutar el ciclo español → alemán con grabaciones reales. Medir palabras cortas, eco, acento, errores, costo y latencia. Requiere credenciales válidas de los proveedores en el servidor; no se han recuperado las claves del proyecto Vercel desaparecido.

**Entrega 2 — experiencia completa.** Conectar la interfaz al núcleo; ejercicios por palabras y frase, aclaraciones, repetición lenta, cambio de idioma y recuperación de errores. La voz manda; el alumno siempre puede pausar, repetir o continuar. Validar controles y geometría en celular y computadora.

**Entrega 3 — persistencia y piloto.** Guardado transaccional, repaso separado por idioma, migración de datos previos cuando existan, exportación y pruebas con varias sesiones. Calibrar las correcciones con revisión humana y ajustar umbrales.

**Entrega 4 — publicación controlada.** Configurar alojamiento y dominio, probar una versión de ensayo, verificar límites de uso y privacidad de voz, monitoreo, versión identificable y reversión. Habilitar los demás idiomas solo después de superar su propio corpus de pruebas. No publicar la versión heredada como solución terminada.

## Qué ya se comprobó y qué falta

- **52 pruebas automáticas del núcleo:** aprobadas, incluidas las del recorrido español → alemán.
- **Comprobación de tipos:** la primera ejecución terminó correctamente tras incorporar el núcleo. Las repeticiones posteriores se quedaron esperando y se cerraron, incluida una comprobación aislada con límite de 25 segundos; no se presentan como comprobaciones finalizadas. No se cambió código TypeScript después de la ejecución aprobada.
- **Compilación de la web heredada:** no completada. Falló la carga del compilador SWC de Next para este Mac y su reparación automática del archivo de dependencias. El intento de instalar exactamente el compilador esperado no terminó y se cerró. No se atribuye este fallo de preparación a un error funcional del producto ni se afirma que la web compile actualmente.
- **Errores heredados:** autoevaluación textual, traducción falsa ante desconexión, nota de respaldo y conteo diario duplicado reproducidos con fixtures.
- **Audio real, precisión pedagógica, interfaz nueva, pruebas en dispositivos y publicación:** pendientes. Una prueba unitaria que acepta el texto «dich» no demuestra que un micrófono lo capture.

El siguiente paso definido es construir y medir la Entrega 1. El plan detallado está en [Decisiones](docs/DECISIONES.md), [Pruebas de aceptación](docs/PLAN-DE-PRUEBAS.md) y [Núcleo nuevo](rebuild/README.md).

La salida de las 52 pruebas está guardada en [core-tests.txt](docs/evidence/core-tests.txt). Los detalles de alcance de la verificación están en [verification.json](docs/evidence/verification.json).
