# Pío · registro de patrones

Una sola solución por clase de problema. Antes de crear una interacción nueva, buscarla aquí.

| Clase de problema | Solución canónica | Dónde vive |
| --- | --- | --- |
| Estado de la sesión | Pío cambia de gesto + título + una línea de ayuda, en una sola región `aria-live` | `Mascot`, `mascotMood`, `sessionCopy` |
| Estado de conexión | Chip con punto y texto arriba; si bloquea la práctica, el título lo explica y debajo va una sola acción | `connectionLabels`, `connectionCopy` |
| Acción primaria | Un solo botón menta en forma de píldora, abajo, con icono y verbo: Hablar / Terminar frase / Pausar | `.mic-button`, `microphoneLabel` |
| Acción secundaria | Píldora con borde, sin relleno | `.secondary` |
| Opción de encendido/apagado | Interruptor con etiqueta visible a la derecha | `.switch` |
| Lo que dijo la persona | Burbuja alineada a la derecha con la etiqueta «Dijiste» | `.bubble.mine` |
| Lo que dice Pío | Tarjeta-burbuja a la izquierda con etiqueta, frase grande y acciones | `PhraseCard` |
| Palabras por practicar | Fichas ámbar con icono de reproducir; siempre seguidas de «Después, repite la frase completa.» | `.focus-words` |
| Error recuperable | Aviso ámbar con texto humano y un botón que repite justo lo que falló | `.notice.error`, `retry()` |
| Logro | Pío celebra, la tarjeta se marca «Bien dicho» con icono y el contador del día sube | `mood-happy`, `.phrase-card.accepted` |
| Ayuda y privacidad | Desplegables junto a la tarea, nunca en otra página | `.help-details` |

## Vocabulario

Hablar · Terminar frase · Pausar · Escuchar frase · Escuchar (palabra) · Más despacio · Guardar y continuar · Comprobar de nuevo · Nueva conversación · Intentar de nuevo.

## Excepciones

Ninguna registrada.
