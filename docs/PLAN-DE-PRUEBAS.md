# Pruebas de aceptación de Pío web

Este plan convierte «que funcione sin fallas» en condiciones comprobables. Cero fallas absolutas no es una garantía realista; ninguna versión se considera lista por el hecho de compilar o mostrar una pantalla. Los resultados que dependen de micrófono, hablantes y servicios reales siguen pendientes.

Recorrido inicial de pruebas: **español → alemán**, manteniendo y restaurando cualquier último par válido elegido por el usuario. El corpus inicial debe incluir «Ich liebe dich», «ich», «dich», «Guten Morgen», «Haus», «ich heiße» y una frase con omisión deliberada. Una persona competente en alemán debe revisar tanto la medición como el consejo, especialmente la diferencia entre los sonidos de «ich» y «Bach», vocales largas/cortas, diéresis y aspiración de la “h”. Estos son casos propuestos, no resultados ya medidos.

## Casos indispensables del producto

1. Elegir idioma propio y objetivo; recargar y conservar la selección.
2. Iniciar con un toque; permiso aceptado → escucha visible; rechazado → explicación y recuperación sin bucle de avisos.
3. Hablar una frase propia → transcripción correcta, traducción natural y audio en el idioma elegido.
4. Repetirla → evaluación del audio vinculada a esa frase y grabación.
5. Omitir una palabra → no aprobar la frase completa.
6. Pronunciar mal un sonido → no confundir una transcripción corregida por el reconocedor con pronunciación perfecta.
7. Practicar una palabra corta, también de una sola sílaba → recibir resultado o un aviso explícito, sin silencio inexplicable.
8. Durante el ejercicio, decir otra frase en el idioma propio → nueva traducción y limpieza del ejercicio anterior.
9. Durante una palabra, decir la frase completa → evaluar la frase y abandonar correctamente el ejercicio de palabra.
10. Pío reproduce audio por altavoz → no se puntúa a sí mismo. Eliminar captura durante reproducción y comprobar la cola acústica sin usar igualdad textual como prueba de eco.
11. Repetir inmediatamente después de Pío → no descartar la voz humana solo porque repite el mismo texto.
12. Frase en el idioma objetivo sin referencia previa → no compararla consigo misma ni asignarle un 10. Evaluar acústicamente en modalidad libre; si es aceptable, continuar la conversación. Si requiere corrección, practicarla hasta que sea aceptable.
13. Silencio, ruido, música y conversación de fondo → no guardar progreso. Un detector de voz humana no distingue por sí solo al usuario de una televisión con voces.
14. Idioma ambiguo → aclaración breve con opción de traducción o práctica; no inventar certeza.
15. Desconexión, 429, 500, 503 y cuota agotada → mensaje útil y salida del estado de espera; nunca traducción original ni nota de respaldo.
16. Audio de respuesta bloqueado por el navegador → «Toca para escuchar», conservando la frase.
17. Cambiar de idioma, pausar o reiniciar durante una llamada lenta → cancelar e ignorar su respuesta tardía.
18. Reintentar una operación o recibir dos respuestas → un solo resultado y un solo registro de progreso.
19. Volver de otra pestaña, bloqueo del teléfono, llamada entrante o cambio de auriculares → sesión pausada o recuperable; sin micrófonos huérfanos.
20. La meta diaria usa la zona horaria del alumno; tres repeticiones de una frase no se presentan como tres frases distintas.
21. Repasos separados por idioma y variante; no mostrar una frase alemana al practicar italiano.
22. Almacén lleno, datos antiguos o formato dañado → aviso, recuperación/exportación cuando sea posible; no indicar «guardado» sin confirmación.
23. Cambio de versión → aviso seguro entre turnos; no recargar durante una grabación o sobrescribir progreso.

## Matriz de uso real

Probar Safari en iPhone físico, Safari y Chrome en Mac, Chrome en Android físico y Edge/Chrome en una computadora adicional. Registrar versión exacta del navegador y sistema. Cada plataforma debe cubrir micrófono integrado, altavoz, auriculares, silencio, ruido moderado, red normal y red degradada.

Verificar geometría en 320, 390, 768 y 1440 píxeles: sin desplazamiento horizontal, controles accesibles, texto legible, teclado sin ocultar acciones, estados anunciados por lector de pantalla y reducción de movimiento. Un navegador emulado a 390 píxeles no sustituye una prueba acústica en iPhone.

## Objetivos propuestos para el piloto

- Al menos 30 ciclos completos por plataforma principal y por par habilitado, sin bloqueo irrecuperable ni pérdida de progreso.
- Cero aprobados ante silencio, audio de Pío, palabras omitidas y errores de servicio en el corpus de regresión definido. Esto no garantiza cero falsos aprobados fuera del corpus.
- Al menos 95% de los intentos del corpus con habla válida deben salir de escucha hacia procesamiento o una aclaración visible. Revisar manualmente falsos rechazos.
- Objetivo de respuesta visual tras terminar de hablar: p95 ≤ 1 segundo. Objetivo de resultado útil: p95 ≤ 4 segundos en la conexión de referencia; medir por separado transcripción, traducción, evaluación y voz. No confundir reconocimiento de fin de frase con latencia total.
- Un tiempo límite configurable por operación, inicialmente 15 segundos en el transporte, tras el cual aparece una recuperación visible. La cancelación del cliente debe propagarse al servidor cuando sea posible.
- Registrar costo por minuto y por sesión de cinco minutos antes de fijar un límite comercial. Sin precio estimado hasta medir proveedor, duración y número de llamadas reales.

## Capas de verificación

**Automáticas del núcleo:** estados, respuestas obsoletas, cancelación, errores, idempotencia, vínculo de evidencia, zona horaria e idioma. Implementadas en `rebuild/tests/core.test.mjs`; utilizan fixtures y no audio real.

**Contratos de servicios:** pendientes. Validación de idioma, variante, tamaños, duración y MIME; autenticación/sesión; límites de uso; errores coherentes; pruebas con adaptadores controlados; ninguna clave en el navegador. Pruebas contra servicios reales solo con configuración válida.

**Integración de audio:** pendiente. Grabación y reproducción reales, metadatos, interrupciones, palabras cortas, eco y envío. Los formatos se negocian con `MediaRecorder.isTypeSupported`, sin asumir que Safari produce WebM. HTTPS o localhost y permisos son requisitos de la captura. [MDN sobre micrófono](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia), [MDN sobre formatos](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder/isTypeSupported_static).

**Validación pedagógica:** pendiente. Comparación ciega con una persona competente en el idioma; calibrar umbrales y lenguaje de corrección. Un proveedor fonético tampoco es una verdad absoluta.

**Salida a producción:** pendiente. Dependencias revisadas, endpoints protegidos, prueba completa en entorno de prueba, monitoreo de disponibilidad, métricas sin grabaciones ni transcripciones privadas, versión identificable y reversión ensayada. Configurar alertas como trabajo explícito de infraestructura, sin crear una automatización de chat no solicitada.
