# Estado de la reconstrucción de Pío

30 de octubre de 2026. Trabajo local en `web/`, dentro de la rama `codex/pio-reinicio-web`. El código anterior se conserva. No se ha publicado una versión nueva ni cambiado `pio.today`.

## Implementado

- Web adaptable para computadora y celular, con inicio explícito del micrófono, orbe, instrucciones breves y controles de pausa, reproducción lenta y escucha entre turnos.
- Restauración de la última selección de idiomas y variantes; reiniciar la conversación no cambia la selección ni borra el progreso.
- Traducción desde el idioma nativo → modelo hablado → repetición con evaluación del audio → nueva corrección o aceptación.
- Habla libre en el idioma objetivo → evaluación acústica sin referencia → corrección si hace falta; conversación si es aceptable.
- Adaptadores reales para ElevenLabs Scribe v2 y v4, Azure Speech y OpenAI. No hay notas sintéticas de respaldo, aprobación por comparación textual consigo misma ni traducción fallida disfrazada de éxito.
- Audio PCM16 mono a 16 kHz; conversión con el remuestreador del navegador cuando es necesaria; límite de 24.5 s y envío acotado.
- Identidad de turno, cancelación, limpieza del micrófono, salida de segundo plano y protección contra respuestas de un idioma o conversación anterior.
- Validación de entrada, límites de tamaño y tiempo, acceso privado requerido en producción y respuestas sin diagnósticos internos de proveedores.
- Progreso local por par, variante y día; el mismo intento no suma dos veces y repetir una misma frase no cuenta como frases distintas.

## Comprobado y no comprobado

Los resultados exactos se conservan en `evidence/web-verification.json`, `evidence/web-tests.txt`, `evidence/web-build.txt` y las capturas de la carpeta `evidence/`.

Pasaron **48 pruebas automáticas**, la comprobación de tipos, la compilación de producción y **16 comprobaciones HTTP** (8 en desarrollo y 8 en producción). La auditoría de dependencias de producción reportó 0 vulnerabilidades conocidas.

Se comprobó el flujo de decisiones con proveedores controlados, rechazo de datos inválidos y fallos, compilación de producción, persistencia en el navegador y geometría sin desbordamiento horizontal en marcos de 320 y 390 píxeles. Estos marcos prueban adaptación visual; **no sustituyen Safari en un iPhone físico ni Chrome en Android**.

No se ha validado el recorrido completo con servicios reales: no hay credenciales de voz configuradas para esta reconstrucción. Tampoco se han medido latencia, falsos aprobados/rechazos, exactitud de traducción ni estabilidad de la captura en dispositivos físicos. Los umbrales de aceptación son provisionales.

La vista actual es una aplicación con controles y servidor, pero **la práctica por voz permanece desactivada hasta contar con la configuración necesaria**. No es una versión lista para anunciar o publicar como terminada.

## Cuentas y decisiones del usuario

La cuenta de ElevenLabs sí estaba abierta. Se dejó preparado el formulario de una clave exclusiva de Pío, con permisos mínimos, límite de 1,000 créditos y vencimiento a 30 días. El usuario eligió **dejarla preparada sin crear**. No se generó una clave ni se cambiaron planes o créditos.

OpenAI y Azure solicitaron inicio de sesión. No se encontraron variables de conexión en las copias recuperadas de Pío. No se reutilizaron claves de otros proyectos. La selección de modelos y las fuentes están en [VOZ.md](VOZ.md).

El archivo de UX anunciado por el usuario todavía no se recibió en este intercambio. Esta revisión visual debe contrastarse con ese archivo cuando llegue; no se afirma que ya se aplicó.

## Antes de darla por lista

1. Acceso autorizado a los servicios, voces nativas elegidas y evaluación real de los contratos de cada proveedor.
2. Revisar el archivo de UX y conciliar los detalles pendientes del diseño histórico: ejercicio progresivo por palabra/grupo/frase, repaso e importación/exportación del avance.
3. Ejecutar el corpus y la matriz de [PLAN-DE-PRUEBAS.md](PLAN-DE-PRUEBAS.md), incluida escucha con ruido y palabras cortas; calibrar umbrales con revisión humana competente en cada idioma.
4. Verificar seguridad, cuotas distribuidas y autenticación adecuada al número de usuarios del lanzamiento. El acceso por código y el contador en memoria son para un piloto privado.
5. Publicar una vista previa revisable; solo después restaurar el dominio, repetir la prueba pública y registrar la versión comprobada.
