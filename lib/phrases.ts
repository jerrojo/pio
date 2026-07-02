import { LanguageCode } from '@/types';

/**
 * Frases sugeridas para el estado en reposo (capability awareness, LukeW):
 * en vez de una pantalla vacía con instrucciones, la app muestra ejemplos
 * accionables de lo que puede hacer. Tocar un chip lo ejecuta de verdad.
 */
export const NATIVE_SAMPLES: Record<LanguageCode, string[]> = {
  es: ['¿Dónde está la estación de tren?', 'Quisiera un café, por favor'],
  en: ['Where is the train station?', "I'd like a coffee, please"],
  it: ['Dove si trova la stazione?', 'Vorrei un caffè, per favore'],
  fr: ['Où est la gare ?', 'Je voudrais un café, s’il vous plaît'],
  de: ['Wo ist der Bahnhof?', 'Ich hätte gern einen Kaffee, bitte'],
  pt: ['Onde fica a estação de comboios?', 'Queria um café, por favor'],
};

export const TARGET_SAMPLES: Record<LanguageCode, string> = {
  es: 'Mucho gusto en conocerte',
  en: 'Nice to meet you',
  it: 'Piacere di conoscerti',
  fr: 'Enchanté de faire ta connaissance',
  de: 'Schön, dich kennenzulernen',
  pt: 'Prazer em conhecer-te',
};
