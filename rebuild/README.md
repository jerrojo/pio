> Base histórica de la primera investigación. La implementación activa está en `../web/`; sus pruebas incluyen conversación libre y persistencia de la última selección. Este núcleo anterior conserva contratos de la primera propuesta y no es el motor de la nueva interfaz.

# Núcleo del reinicio de Pío

Este directorio inicia la reconstrucción para navegador, elegida por el usuario el 30 de octubre de 2026. Contiene reglas de sesión, evaluación, progreso y transporte con pruebas automáticas. **Todavía no está conectado a la interfaz, al micrófono ni a un proveedor de evaluación. No constituye una app terminada.**

## Ejecutar las pruebas

Con Node 22.19 o posterior, sin instalar dependencias adicionales:

```sh
npm --prefix rebuild test
```

La comprobación de tipos se ejecuta desde la raíz del proyecto recuperado:

```sh
node_modules/.bin/tsc --noEmit --incremental false
```

## Contratos

- `core.ts`: un solo turno activo; resultados tardíos invalidados al pausar o reiniciar; evaluación ligada a audio, referencia e idioma; progreso separado por variante regional y día local.
- `transport.ts`: respuestas HTTP, contenido inválido, desconexiones, cancelación y tiempos límite terminan en errores explícitos. No devuelve texto original como traducción ni puntuaciones de respaldo.
- `tests/core.test.mjs`: casos de regresión basados en los fallos observados. Los datos acústicos son fixtures de prueba, no grabaciones reales ni mediciones de un proveedor.

## Límites de esta primera base

Los umbrales de `PILOT_POLICY` son una hipótesis ajustable para el piloto. No están calibrados con estudiantes ni deben presentarse como un estándar pedagógico. El adaptador deberá validar las respuestas externas antes de convertirlas a `Assessment` y conservar la correspondencia con el audio y la referencia.

El estado bloquea **lógicamente** una grabación durante la reproducción; un futuro adaptador de audio debe aplicar ese bloqueo al micrófono, cancelar recursos y controlar las colas. Estas pruebas no demuestran supresión acústica de eco en un teléfono.

`recordMastery` exige un identificador único persistente del intento. Los tokens locales de la sesión no sirven como identificadores entre visitas. El almacenamiento duradero, las migraciones del formato anterior y la protección frente a escrituras desde varias pestañas están pendientes.

La integración web debe conservar un controlador por sesión y pasar sus tokens a todos los callbacks. Al pausar debe detener pistas y reproducción, cancelar solicitudes y liberar recursos; al volver de segundo plano debe requerir una reanudación visible. La máquina de estados no ejecuta estos efectos por sí sola.

El contrato permite distinguir evaluación acústica y coincidencia textual, pero no verifica por sí mismo la autenticidad del proveedor. La evaluación autorizada debe producirse en el servidor; el cliente no puede atribuirse una calificación enviando `source: acoustic`.

El plan de producto, el diagnóstico y los criterios de salida están en [REINICIO.md](../REINICIO.md) y [docs/PLAN-DE-PRUEBAS.md](../docs/PLAN-DE-PRUEBAS.md).
