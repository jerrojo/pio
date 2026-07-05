/**
 * Estética de restricción de Pío: fondo casi negro, hairlines sutiles,
 * un solo acento (iris) y colores semánticos verde/ámbar/rojo/dorado.
 * Sin emojis en la UI (salvo banderas de idioma).
 */
export const colors = {
  bg: '#05060a',
  surface: 'rgba(255,255,255,0.03)',
  hairline: 'rgba(255,255,255,0.08)',
  text: '#f4f5f7',
  textDim: 'rgba(255,255,255,0.55)',
  textFaint: 'rgba(255,255,255,0.32)',
  iris: '#8b9cf9',
  irisDeep: '#3d4b9e',
  good: '#34d399',
  weak: '#f5b84d',
  bad: '#f87171',
  gold: '#e8c268',
} as const;
