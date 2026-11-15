# Decisiones vigentes de Pío

Actualizado el 30 de octubre de 2026. Las instrucciones más recientes del usuario sustituyen la propuesta inicial de un par fijo.

## Confirmadas por el usuario

1. Web para navegador en celular y computadora.
2. El reinicio restaura la última selección del usuario. Español → alemán es un caso de prueba inicial, no un valor forzado.
3. Idioma nativo → traducción → el usuario repite → corrección hasta pronunciación aceptable.
4. Idioma objetivo → evaluación de pronunciación; corregir cuando sea necesario y continuar la conversación cuando sea aceptable.
5. Investigar la voz de Block/Dessa, ElevenLabs y alternativas. La selección final debe responder al aprendizaje y a pruebas reales, no solo a novedad o expresividad.
6. Revisar cuentas existentes. La nueva clave preparada en ElevenLabs debe quedar **sin crear**, según la respuesta explícita del usuario.
7. Aplicar el archivo de UX cuando llegue. Todavía no fue recibido.

## Recuperadas del historial

Orbe, interfaz oscura, seis idiomas, colores con significado, palabras cortas, escucha entre turnos, nueva frase durante un ejercicio, progreso positivo y ausencia de rachas punitivas. La idea de practicar palabras y grupos antes de volver a la frase se conserva en el plan. Biometría, cámara y Face ID pertenecen a documentos antiguos y no son un requisito de este reinicio web.

Las fuentes son el Git recuperado y el diagnóstico local del 15 de julio. No se recuperó una transcripción completa de todos los chats anteriores. Ver [REINICIO.md](../REINICIO.md).

## Implementación y límites

La aplicación activa está en `web/`. Los umbrales acústicos son provisionales, y los adaptadores necesitan validación contra cuentas y audio reales. No se utiliza similitud textual para afirmar corrección fonética. Una caída no produce una traducción original ni una nota de respaldo.

Los idiomas y el progreso se guardan en el navegador. Reiniciar no los borra. No hay sincronización entre dispositivos ni migración automática de notas antiguas que no constituyen evidencia acústica.

Se eligió una arquitectura con proveedores intercambiables. ElevenLabs v4 y Scribe v2 son la primera integración; Azure evalúa audio; OpenAI traduce y conversa. Dessa no ofrece una API pública comprobada en su página oficial. Cartesia queda en la comparación del piloto. Consultar [VOZ.md](VOZ.md).

La publicación requiere comprobar los servicios, el recorrido físico en teléfonos y la configuración de acceso. No se cambió el dominio ni se lanzó una app incompleta como terminada. El estado completo está en [REINICIO-WEB.md](REINICIO-WEB.md).
