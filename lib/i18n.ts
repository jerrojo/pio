import { LanguageCode } from '@/types';

/**
 * i18n de Pío: todas las cadenas de UI y las frases que el coach DICE
 * en el idioma nativo del usuario. El diccionario español es la fuente
 * de verdad tipada; los demás idiomas están obligados a cubrir cada clave.
 */

const es = {
  // ── LanguagePairing ──
  pairingTitle: '¿Qué idioma quieres aprender?',
  pairingSubtitle:
    'Habla con Pío: traduce lo que digas y evalúa tu pronunciación en tiempo real',
  pairingLearnLabel: 'Quiero aprender',
  pairingISpeak: 'Yo hablo',
  pairingNativeAria: 'Tu idioma nativo',
  pairingStart: 'Empezar',

  // ── Fases / estado ──
  phaseListening: 'Te escucho',
  phaseTranscribing: 'Un momento',
  phaseTranslating: 'Traduciendo',
  phaseEvaluating: 'Evaluando tu pronunciación',
  repeatAfterMe: 'Repite después de mí',
  idleHint: 'Habla cuando quieras — en {native} traduzco, en {target} te evalúo',

  // ── Tarjetas de conversación ──
  heardLabel: 'Escuché',
  repeatAloudSuffix: '— repítelo en voz alta',
  youSaid: 'Dijiste:',
  drillIsolated: 'Práctica aislada',
  drillTogether: 'Ahora juntas',
  drillTapWord: 'toca la palabra para oírla',
  tapWordSolo: 'Toca una palabra para escucharla sola',
  resultAlmost: 'Casi — inténtalo otra vez',
  resultGood: 'Bien',
  resultExcellent: 'Excelente',
  sayAgainHint: 'Solo dilo de nuevo — te sigo escuchando.',

  // ── Errores ──
  errNotHeard: 'No te escuché bien — inténtalo otra vez.',
  errProcessing: 'Hubo un problema procesando tu voz. Sigue hablando, te escucho.',
  errNoVoice: 'La voz no está disponible ahora — lee la frase en pantalla.',

  // ── Micrófono / orbe ──
  micTitle: 'Pío necesita escucharte',
  micBody:
    'Permite el acceso al micrófono en tu navegador para conversar. Todo funciona con tu voz: no hay nada que escribir.',
  micAllow: 'Permitir micrófono',
  micActivating: 'Activando micrófono…',
  orbTouchStart: 'Toca el orbe una vez para comenzar',
  orbTouchHear: 'Toca el orbe para escuchar la respuesta',

  // ── Header ──
  todayChip: 'hoy {n}/{goal}',
  masteredTitle: '{n} frases dominadas',

  // ── Accesibilidad ──
  ariaChangeLanguages: 'Cambiar idiomas',
  ariaUnlockAudio: 'Tocar para activar el audio',
  ariaNewPhrase: 'Tocar para nueva frase',
  ariaListenAgain: 'Escuchar de nuevo',
  ariaListenWord: 'Escuchar {word}',

  // ── Frases HABLADAS por el coach ──
  speakReviewAsk: 'Repasemos. ¿Cómo se dice: {phrase}?',
  speakReviewListen: 'Repasemos esta frase. Escucha y repite.',
  speakNextWord: '¡Esa ya está! Siguiente palabra:',
  speakTogether: 'Ahora estas palabras juntas:',
  speakFullPhrase: '¡Muy bien! Ahora la frase completa.',
  speakByParts: 'Vamos por partes. Repite solo:',
  speakAlmostTogether: 'Casi. Estas palabras juntas:',
  speakListenAgain: 'Otra vez. Escucha con atención.',
  speakExcellent: '¡Excelente! Lo dominaste.',
  speakWellDone: '¡Muy bien! Lo lograste.',
  speakDailyGoal: '¡Meta del día cumplida! Tres frases dominadas.',
  speakTryAgain: 'Casi. Inténtalo otra vez.',
};

export type UIKey = keyof typeof es;

const en: Record<UIKey, string> = {
  pairingTitle: 'Which language do you want to learn?',
  pairingSubtitle:
    'Talk to Pío: it translates what you say and scores your pronunciation in real time',
  pairingLearnLabel: 'I want to learn',
  pairingISpeak: 'I speak',
  pairingNativeAria: 'Your native language',
  pairingStart: 'Start',

  phaseListening: "I'm listening",
  phaseTranscribing: 'One moment',
  phaseTranslating: 'Translating',
  phaseEvaluating: 'Scoring your pronunciation',
  repeatAfterMe: 'Repeat after me',
  idleHint: 'Speak whenever you like — in {native} I translate, in {target} I score you',

  heardLabel: 'I heard',
  repeatAloudSuffix: '— repeat it out loud',
  youSaid: 'You said:',
  drillIsolated: 'Isolated practice',
  drillTogether: 'Now together',
  drillTapWord: 'tap the word to hear it',
  tapWordSolo: 'Tap a word to hear it on its own',
  resultAlmost: 'Almost — try again',
  resultGood: 'Good',
  resultExcellent: 'Excellent',
  sayAgainHint: "Just say it again — I'm still listening.",

  errNotHeard: "I didn't catch that — try again.",
  errProcessing: "There was a problem processing your voice. Keep talking, I'm listening.",
  errNoVoice: "Voice isn't available right now — read the phrase on screen.",

  micTitle: 'Pío needs to hear you',
  micBody:
    "Allow microphone access in your browser to talk. Everything works with your voice: there's nothing to type.",
  micAllow: 'Allow microphone',
  micActivating: 'Turning on the microphone…',
  orbTouchStart: 'Tap the orb once to begin',
  orbTouchHear: 'Tap the orb to hear the reply',

  todayChip: 'today {n}/{goal}',
  masteredTitle: '{n} phrases mastered',

  ariaChangeLanguages: 'Change languages',
  ariaUnlockAudio: 'Tap to enable audio',
  ariaNewPhrase: 'Tap for a new phrase',
  ariaListenAgain: 'Listen again',
  ariaListenWord: 'Listen to {word}',

  speakReviewAsk: "Let's review. How do you say: {phrase}?",
  speakReviewListen: "Let's review this phrase. Listen and repeat.",
  speakNextWord: "That one's done! Next word:",
  speakTogether: 'Now these words together:',
  speakFullPhrase: 'Great! Now the full phrase.',
  speakByParts: "Let's break it down. Repeat just:",
  speakAlmostTogether: 'Almost. These words together:',
  speakListenAgain: 'One more time. Listen carefully.',
  speakExcellent: "Excellent! You've mastered it.",
  speakWellDone: 'Well done! You got it.',
  speakDailyGoal: 'Daily goal complete! Three phrases mastered.',
  speakTryAgain: 'Almost. Try it again.',
};

const it: Record<UIKey, string> = {
  pairingTitle: 'Che lingua vuoi imparare?',
  pairingSubtitle:
    'Parla con Pío: traduce quello che dici e valuta la tua pronuncia in tempo reale',
  pairingLearnLabel: 'Voglio imparare',
  pairingISpeak: 'Io parlo',
  pairingNativeAria: 'La tua lingua madre',
  pairingStart: 'Inizia',

  phaseListening: 'Ti ascolto',
  phaseTranscribing: 'Un momento',
  phaseTranslating: 'Sto traducendo',
  phaseEvaluating: 'Sto valutando la tua pronuncia',
  repeatAfterMe: 'Ripeti dopo di me',
  idleHint: 'Parla quando vuoi — in {native} traduco, in {target} ti valuto',

  heardLabel: 'Ho sentito',
  repeatAloudSuffix: '— ripetilo ad alta voce',
  youSaid: 'Hai detto:',
  drillIsolated: 'Pratica isolata',
  drillTogether: 'Ora insieme',
  drillTapWord: 'tocca la parola per ascoltarla',
  tapWordSolo: 'Tocca una parola per ascoltarla da sola',
  resultAlmost: 'Quasi — riprova',
  resultGood: 'Bene',
  resultExcellent: 'Eccellente',
  sayAgainHint: 'Dillo di nuovo — ti sto ancora ascoltando.',

  errNotHeard: 'Non ti ho sentito bene — riprova.',
  errProcessing: "C'è stato un problema con la tua voce. Continua a parlare, ti ascolto.",
  errNoVoice: 'La voce non è disponibile ora — leggi la frase sullo schermo.',

  micTitle: 'Pío ha bisogno di sentirti',
  micBody:
    "Consenti l'accesso al microfono nel browser per conversare. Tutto funziona con la tua voce: non c'è niente da scrivere.",
  micAllow: 'Consenti microfono',
  micActivating: 'Attivo il microfono…',
  orbTouchStart: 'Tocca la sfera una volta per iniziare',
  orbTouchHear: 'Tocca la sfera per ascoltare la risposta',

  todayChip: 'oggi {n}/{goal}',
  masteredTitle: '{n} frasi padroneggiate',

  ariaChangeLanguages: 'Cambia lingue',
  ariaUnlockAudio: "Tocca per attivare l'audio",
  ariaNewPhrase: 'Tocca per una nuova frase',
  ariaListenAgain: 'Ascolta di nuovo',
  ariaListenWord: 'Ascolta {word}',

  speakReviewAsk: 'Ripassiamo. Come si dice: {phrase}?',
  speakReviewListen: 'Ripassiamo questa frase. Ascolta e ripeti.',
  speakNextWord: 'Questa è fatta! Prossima parola:',
  speakTogether: 'Ora queste parole insieme:',
  speakFullPhrase: 'Molto bene! Ora la frase completa.',
  speakByParts: 'Andiamo per gradi. Ripeti solo:',
  speakAlmostTogether: 'Quasi. Queste parole insieme:',
  speakListenAgain: 'Di nuovo. Ascolta con attenzione.',
  speakExcellent: "Eccellente! L'hai padroneggiata.",
  speakWellDone: "Molto bene! Ce l'hai fatta.",
  speakDailyGoal: 'Obiettivo del giorno raggiunto! Tre frasi padroneggiate.',
  speakTryAgain: 'Quasi. Riprova.',
};

const fr: Record<UIKey, string> = {
  pairingTitle: 'Quelle langue veux-tu apprendre ?',
  pairingSubtitle:
    'Parle avec Pío : il traduit ce que tu dis et évalue ta prononciation en temps réel',
  pairingLearnLabel: 'Je veux apprendre',
  pairingISpeak: 'Je parle',
  pairingNativeAria: 'Ta langue maternelle',
  pairingStart: 'Commencer',

  phaseListening: "Je t'écoute",
  phaseTranscribing: 'Un instant',
  phaseTranslating: 'Traduction en cours',
  phaseEvaluating: 'Évaluation de ta prononciation',
  repeatAfterMe: 'Répète après moi',
  idleHint: "Parle quand tu veux — en {native} je traduis, en {target} je t'évalue",

  heardLabel: "J'ai entendu",
  repeatAloudSuffix: '— répète-le à voix haute',
  youSaid: 'Tu as dit :',
  drillIsolated: 'Pratique isolée',
  drillTogether: 'Maintenant ensemble',
  drillTapWord: "touche le mot pour l'écouter",
  tapWordSolo: "Touche un mot pour l'écouter seul",
  resultAlmost: 'Presque — réessaie',
  resultGood: 'Bien',
  resultExcellent: 'Excellent',
  sayAgainHint: "Redis-le simplement — je t'écoute toujours.",

  errNotHeard: "Je ne t'ai pas bien entendu — réessaie.",
  errProcessing: "Un problème est survenu avec ta voix. Continue de parler, je t'écoute.",
  errNoVoice: "La voix n'est pas disponible pour l'instant — lis la phrase à l'écran.",

  micTitle: "Pío a besoin de t'entendre",
  micBody:
    'Autorise l’accès au micro dans ton navigateur pour converser. Tout fonctionne à la voix : rien à écrire.',
  micAllow: 'Autoriser le micro',
  micActivating: 'Activation du micro…',
  orbTouchStart: "Touche l'orbe une fois pour commencer",
  orbTouchHear: "Touche l'orbe pour écouter la réponse",

  todayChip: 'auj. {n}/{goal}',
  masteredTitle: '{n} phrases maîtrisées',

  ariaChangeLanguages: 'Changer de langues',
  ariaUnlockAudio: "Toucher pour activer l'audio",
  ariaNewPhrase: 'Toucher pour une nouvelle phrase',
  ariaListenAgain: 'Écouter à nouveau',
  ariaListenWord: 'Écouter {word}',

  speakReviewAsk: 'Révisons. Comment dit-on : {phrase} ?',
  speakReviewListen: 'Révisons cette phrase. Écoute et répète.',
  speakNextWord: "Celui-là, c'est bon ! Mot suivant :",
  speakTogether: 'Maintenant ces mots ensemble :',
  speakFullPhrase: 'Très bien ! Maintenant la phrase complète.',
  speakByParts: 'Allons-y étape par étape. Répète seulement :',
  speakAlmostTogether: 'Presque. Ces mots ensemble :',
  speakListenAgain: 'Encore une fois. Écoute attentivement.',
  speakExcellent: 'Excellent ! Tu la maîtrises.',
  speakWellDone: 'Très bien ! Tu as réussi.',
  speakDailyGoal: 'Objectif du jour atteint ! Trois phrases maîtrisées.',
  speakTryAgain: 'Presque. Réessaie.',
};

const de: Record<UIKey, string> = {
  pairingTitle: 'Welche Sprache möchtest du lernen?',
  pairingSubtitle:
    'Sprich mit Pío: Er übersetzt, was du sagst, und bewertet deine Aussprache in Echtzeit',
  pairingLearnLabel: 'Ich möchte lernen',
  pairingISpeak: 'Ich spreche',
  pairingNativeAria: 'Deine Muttersprache',
  pairingStart: 'Loslegen',

  phaseListening: 'Ich höre dir zu',
  phaseTranscribing: 'Einen Moment',
  phaseTranslating: 'Übersetze',
  phaseEvaluating: 'Bewerte deine Aussprache',
  repeatAfterMe: 'Sprich mir nach',
  idleHint: 'Sprich, wann du willst — auf {native} übersetze ich, auf {target} bewerte ich dich',

  heardLabel: 'Ich habe gehört',
  repeatAloudSuffix: '— sprich es laut nach',
  youSaid: 'Du hast gesagt:',
  drillIsolated: 'Isoliertes Üben',
  drillTogether: 'Jetzt zusammen',
  drillTapWord: 'tippe auf das Wort, um es zu hören',
  tapWordSolo: 'Tippe auf ein Wort, um es einzeln zu hören',
  resultAlmost: 'Fast — versuch es noch einmal',
  resultGood: 'Gut',
  resultExcellent: 'Ausgezeichnet',
  sayAgainHint: 'Sag es einfach noch einmal — ich höre weiter zu.',

  errNotHeard: 'Ich habe dich nicht gut verstanden — versuch es noch einmal.',
  errProcessing: 'Es gab ein Problem mit deiner Stimme. Sprich weiter, ich höre zu.',
  errNoVoice: 'Die Stimme ist gerade nicht verfügbar — lies den Satz auf dem Bildschirm.',

  micTitle: 'Pío muss dich hören',
  micBody:
    'Erlaube den Mikrofonzugriff in deinem Browser, um zu sprechen. Alles funktioniert mit deiner Stimme: Es gibt nichts zu tippen.',
  micAllow: 'Mikrofon erlauben',
  micActivating: 'Mikrofon wird aktiviert…',
  orbTouchStart: 'Tippe einmal auf die Kugel, um zu beginnen',
  orbTouchHear: 'Tippe auf die Kugel, um die Antwort zu hören',

  todayChip: 'heute {n}/{goal}',
  masteredTitle: '{n} Sätze gemeistert',

  ariaChangeLanguages: 'Sprachen wechseln',
  ariaUnlockAudio: 'Tippen, um Audio zu aktivieren',
  ariaNewPhrase: 'Tippen für einen neuen Satz',
  ariaListenAgain: 'Noch einmal anhören',
  ariaListenWord: '{word} anhören',

  speakReviewAsk: 'Wiederholen wir. Wie sagt man: {phrase}?',
  speakReviewListen: 'Wiederholen wir diesen Satz. Hör zu und sprich nach.',
  speakNextWord: 'Das sitzt! Nächstes Wort:',
  speakTogether: 'Jetzt diese Wörter zusammen:',
  speakFullPhrase: 'Sehr gut! Jetzt der ganze Satz.',
  speakByParts: 'Gehen wir es Schritt für Schritt an. Sprich nur nach:',
  speakAlmostTogether: 'Fast. Diese Wörter zusammen:',
  speakListenAgain: 'Noch einmal. Hör genau zu.',
  speakExcellent: 'Ausgezeichnet! Du beherrschst es.',
  speakWellDone: 'Sehr gut! Du hast es geschafft.',
  speakDailyGoal: 'Tagesziel erreicht! Drei Sätze gemeistert.',
  speakTryAgain: 'Fast. Versuch es noch einmal.',
};

const pt: Record<UIKey, string> = {
  pairingTitle: 'Que idioma queres aprender?',
  pairingSubtitle:
    'Fala com o Pío: ele traduz o que dizes e avalia a tua pronúncia em tempo real',
  pairingLearnLabel: 'Quero aprender',
  pairingISpeak: 'Eu falo',
  pairingNativeAria: 'A tua língua materna',
  pairingStart: 'Começar',

  phaseListening: 'Estou a ouvir-te',
  phaseTranscribing: 'Um momento',
  phaseTranslating: 'A traduzir',
  phaseEvaluating: 'A avaliar a tua pronúncia',
  repeatAfterMe: 'Repete depois de mim',
  idleHint: 'Fala quando quiseres — em {native} traduzo, em {target} avalio-te',

  heardLabel: 'Ouvi',
  repeatAloudSuffix: '— repete em voz alta',
  youSaid: 'Disseste:',
  drillIsolated: 'Prática isolada',
  drillTogether: 'Agora juntas',
  drillTapWord: 'toca na palavra para a ouvir',
  tapWordSolo: 'Toca numa palavra para a ouvir sozinha',
  resultAlmost: 'Quase — tenta outra vez',
  resultGood: 'Bem',
  resultExcellent: 'Excelente',
  sayAgainHint: 'Diz outra vez — continuo a ouvir-te.',

  errNotHeard: 'Não te ouvi bem — tenta outra vez.',
  errProcessing: 'Houve um problema ao processar a tua voz. Continua a falar, estou a ouvir.',
  errNoVoice: 'A voz não está disponível agora — lê a frase no ecrã.',

  micTitle: 'O Pío precisa de te ouvir',
  micBody:
    'Permite o acesso ao microfone no teu navegador para conversar. Tudo funciona com a tua voz: não há nada para escrever.',
  micAllow: 'Permitir microfone',
  micActivating: 'A ativar o microfone…',
  orbTouchStart: 'Toca na esfera uma vez para começar',
  orbTouchHear: 'Toca na esfera para ouvir a resposta',

  todayChip: 'hoje {n}/{goal}',
  masteredTitle: '{n} frases dominadas',

  ariaChangeLanguages: 'Mudar de idiomas',
  ariaUnlockAudio: 'Tocar para ativar o áudio',
  ariaNewPhrase: 'Tocar para uma nova frase',
  ariaListenAgain: 'Ouvir outra vez',
  ariaListenWord: 'Ouvir {word}',

  speakReviewAsk: 'Vamos rever. Como se diz: {phrase}?',
  speakReviewListen: 'Vamos rever esta frase. Ouve e repete.',
  speakNextWord: 'Essa já está! Próxima palavra:',
  speakTogether: 'Agora estas palavras juntas:',
  speakFullPhrase: 'Muito bem! Agora a frase completa.',
  speakByParts: 'Vamos por partes. Repete só:',
  speakAlmostTogether: 'Quase. Estas palavras juntas:',
  speakListenAgain: 'Outra vez. Ouve com atenção.',
  speakExcellent: 'Excelente! Dominaste a frase.',
  speakWellDone: 'Muito bem! Conseguiste.',
  speakDailyGoal: 'Meta do dia cumprida! Três frases dominadas.',
  speakTryAgain: 'Quase. Tenta outra vez.',
};

const DICTS: Record<LanguageCode, Record<UIKey, string>> = { es, en, it, fr, de, pt };

/** Nombre de cada idioma, visto desde cada idioma de UI */
const NAMES: Record<LanguageCode, Record<LanguageCode, string>> = {
  es: { it: 'Italiano', es: 'Español', en: 'Inglés', fr: 'Francés', de: 'Alemán', pt: 'Portugués' },
  en: { it: 'Italian', es: 'Spanish', en: 'English', fr: 'French', de: 'German', pt: 'Portuguese' },
  it: { it: 'Italiano', es: 'Spagnolo', en: 'Inglese', fr: 'Francese', de: 'Tedesco', pt: 'Portoghese' },
  fr: { it: 'Italien', es: 'Espagnol', en: 'Anglais', fr: 'Français', de: 'Allemand', pt: 'Portugais' },
  de: { it: 'Italienisch', es: 'Spanisch', en: 'Englisch', fr: 'Französisch', de: 'Deutsch', pt: 'Portugiesisch' },
  pt: { it: 'Italiano', es: 'Espanhol', en: 'Inglês', fr: 'Francês', de: 'Alemão', pt: 'Português' },
};

/** Acento/voz de cada idioma objetivo, localizado */
const ACCENTS: Record<LanguageCode, Record<LanguageCode, string>> = {
  es: { it: 'Acento de Roma', es: 'Acento de Madrid', en: 'Londres / Wellington', fr: 'Acento de París', de: 'Acento de Berlín', pt: 'Portugal' },
  en: { it: 'Rome accent', es: 'Madrid accent', en: 'London / Wellington', fr: 'Paris accent', de: 'Berlin accent', pt: 'Portugal' },
  it: { it: 'Accento di Roma', es: 'Accento di Madrid', en: 'Londra / Wellington', fr: 'Accento di Parigi', de: 'Accento di Berlino', pt: 'Portogallo' },
  fr: { it: 'Accent de Rome', es: 'Accent de Madrid', en: 'Londres / Wellington', fr: 'Accent de Paris', de: 'Accent de Berlin', pt: 'Portugal' },
  de: { it: 'Akzent aus Rom', es: 'Akzent aus Madrid', en: 'London / Wellington', fr: 'Akzent aus Paris', de: 'Akzent aus Berlin', pt: 'Portugal' },
  pt: { it: 'Sotaque de Roma', es: 'Sotaque de Madrid', en: 'Londres / Wellington', fr: 'Sotaque de Paris', de: 'Sotaque de Berlim', pt: 'Portugal' },
};

/** Cada idioma en su propio nombre — para los chips de "Yo hablo" */
export const ENDONYMS: Record<LanguageCode, string> = {
  it: 'Italiano',
  es: 'Español',
  en: 'English',
  fr: 'Français',
  de: 'Deutsch',
  pt: 'Português',
};

/** Traduce una clave al idioma dado, con variables {asi} */
export function t(
  lang: LanguageCode,
  key: UIKey,
  vars?: Record<string, string | number>
): string {
  let text = (DICTS[lang] ?? DICTS.es)[key] ?? DICTS.es[key];
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      text = text.split(`{${k}}`).join(String(v));
    }
  }
  return text;
}

/** Nombre del idioma `code` escrito en el idioma de UI `ui` */
export function langName(ui: LanguageCode, code: LanguageCode): string {
  return NAMES[ui]?.[code] ?? NAMES.es[code];
}

/** Acento del idioma `code` descrito en el idioma de UI `ui` */
export function langAccent(ui: LanguageCode, code: LanguageCode): string {
  return ACCENTS[ui]?.[code] ?? ACCENTS.es[code];
}
