/**
 * Limpieza de habla espontánea: muletillas, titubeos y meta-frases.
 *
 * Regla de oro: solo se elimina lo inequívoco. "este" o "like" pueden ser
 * contenido real, así que las muletillas ambiguas solo se quitan al INICIO
 * del enunciado; los titubeos puros (mmm, ehh, um) se quitan en cualquier
 * posición.
 */

/** Titubeos puros: nunca son contenido (cualquier posición) */
const HESITATIONS =
  /(?:^|\s)(?:m+h*m+|e+h+|u+h+m*|u+m+|e+m+|e+r+m*|a+h+|hm+)(?=[\s,.!?…]|$)/giu;

/** Muletillas de arranque (solo al inicio, se aplican en cadena) */
const LEADING_FILLERS =
  /^(?:este|esteee|bueno|pues|o sea|osea|a ver|haber|ok|okey|okay|vale|sale|so|well|you know|i mean|like|alors|bon|ben|euh|also|na ja|tja|então|bem|olha|allora|beh|cioè|dunque)[\s,.…]+/iu;

/**
 * Meta-frases: el usuario pregunta CÓMO decir algo. Se extrae el contenido
 * real y se descarta la pregunta. Cubre los 6 idiomas de la app.
 */
const META_PATTERNS: RegExp[] = [
  /(?:cómo|como)\s+(?:se\s+dice|se\s+diría|digo|dirías?|se\s+escribe)[\s,.…]+/iu, // es
  /how\s+(?:do\s+(?:you|i)\s+say|to\s+say|would\s+(?:you|i)\s+say)[\s,.…]+/iu, // en
  /comment\s+(?:dit[-\s]?on|on\s+dit|je\s+dis|dire)[\s,.…]+/iu, // fr
  /come\s+si\s+dice[\s,.…]+/iu, // it
  /wie\s+sagt\s+man[\s,.…]+/iu, // de
  /como\s+(?:se\s+diz|é\s+que\s+se\s+diz|digo)[\s,.…]+/iu, // pt
];

/** Cola tipo "...en inglés" / "in english" que acompaña a la meta-frase */
const META_TAIL =
  /\s+(?:en|in|em|auf|na)\s+(?:inglés|ingles|english|español|espanol|spanish|italiano|italian|francés|frances|french|français|alemán|aleman|german|deutsch|portugués|portugues|portuguese|português)\??\s*$/iu;

export interface CleanResult {
  text: string;
  /** true si era una pregunta "cómo se dice X" y text es X */
  wasMeta: boolean;
}

/** Quita titubeos puros en cualquier posición + muletillas de arranque */
export function stripFillers(input: string): string {
  let t = input.replace(HESITATIONS, ' ');
  t = t.replace(/\s{2,}/g, ' ').trim();
  // pela muletillas de arranque en cadena ("bueno pues este ...")
  for (let i = 0; i < 4; i++) {
    const next = t.replace(LEADING_FILLERS, '');
    if (next === t) break;
    t = next.trim();
  }
  // puntuación huérfana al inicio
  return t.replace(/^[,.…\s]+/u, '').trim();
}

/** Limpieza completa: fillers + extracción de "cómo se dice X" */
export function cleanUtterance(input: string): CleanResult {
  let t = stripFillers(input);
  let wasMeta = false;

  for (const pattern of META_PATTERNS) {
    const m = t.match(pattern);
    if (m && m.index !== undefined) {
      // El contenido real es lo que sigue a la meta-frase
      t = t.slice(m.index + m[0].length);
      wasMeta = true;
      break;
    }
  }

  if (wasMeta) {
    t = t.replace(META_TAIL, '');
    // el payload puede traer sus propias muletillas ("cómo se dice... este... gracias")
    t = stripFillers(t);
  }

  // limpia comillas/puntuación de cierre alrededor del payload
  t = t.replace(/^["'«“”‘’¿¡]+|["'»“”‘’?!.…]+$/gu, '').trim();

  return { text: t, wasMeta };
}
