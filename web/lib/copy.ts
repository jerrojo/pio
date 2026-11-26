import { base, locales, type Locale } from "./domain.ts";

// Everything Pío says, in the learner's own language. Pío speaks in the first
// person, informally, in short sentences, and never blames the learner.
const es = {
  quote: (word: string) => `«${word}»`,
  errors: {
    "phrase-too-long": "Esa estuvo larguita. Prueba con una frase más corta.",
    NotAllowedError:
      "Necesito permiso para escucharte. Permite el micrófono en tu navegador y vuelve a intentar.",
    NotFoundError:
      "No encuentro ningún micrófono. Conecta uno y vuelve a intentar.",
    NotReadableError:
      "Otra app está usando tu micrófono. Ciérrala y vuelve a intentar.",
    "unsupported-microphone":
      "Este navegador no me deja usar el micrófono. Ábreme en Safari o Chrome actualizado.",
    "not-configured": "Todavía no hablo ese idioma. Elige otro por ahora.",
    "provider-busy":
      "Estoy un poco saturado. Dame unos segundos y vuelve a intentar.",
    "provider-quota":
      "Se me acabaron los créditos de voz. Hay que recargarlos en ElevenLabs para seguir.",
    "provider-timeout": "Me tardé demasiado. ¿Lo intentamos otra vez?",
    "assessment-incomplete":
      "No alcancé a oír toda la frase. Dila otra vez, completa.",
    "assessment-unavailable":
      "No te escuché con claridad. Dilo otra vez cuando quieras.",
    "access-required": "Tu sesión se cerró. Escribe tu código para seguir.",
    "too-many-requests": "Vamos muy rápido. Descansa un minutito y seguimos.",
    "invalid-audio": "La grabación se cortó. Dilo otra vez.",
    "capture-failed": "El micrófono se cortó. Toca Hablar y dilo otra vez.",
    TypeError:
      "Parece que se fue el internet. Revisa tu conexión y lo intentamos de nuevo.",
    TimeoutError:
      "Parece que el internet está lento. Revisa tu conexión y lo intentamos de nuevo.",
  } as Record<string, string>,
  failed: "Algo me falló. ¿Lo intentamos otra vez?",
  voiceFailed: "No pude reproducir la voz. Toca para intentarlo otra vez.",
  soundBlocked:
    "Tu navegador tiene el sonido bloqueado. Toca para oír la frase.",
  saveFailed: "No pude guardar tus idiomas para la próxima visita.",
  stumble: "Tuvimos un tropiezo",
  connection: {
    checking: {
      title: "Despertando a Pío…",
      description: "Esto puede tardar unos segundos.",
    },
    offline: {
      title: "No logro conectarme",
      description:
        "Revisa tu internet y vuelve a intentar. Tus idiomas siguen guardados.",
    },
    access: {
      title: "¡Hola! Necesito tu código",
      description: "Escríbelo para empezar a practicar.",
    },
    unconfigured: {
      title: "Todavía no hablo ese idioma",
      description: "Elige otro idioma por ahora, arriba a la derecha.",
    },
  },
  session: {
    fallbackLanguage: "el idioma que aprendes",
    permission: {
      title: "Déjame escucharte",
      description: "Dale permiso al micrófono en el aviso de tu navegador.",
    },
    thinking: { title: "Déjame pensar…", description: "Un segundito." },
    place: (at: number, total: number) => `Palabra ${at} de ${total}.`,
    again: "Otra vez, despacito",
    parts: "Vamos por partes",
    listenTo: (named: string) => `Escucha: ${named}.`,
    sayOnly: (named: string) => `Di solo: ${named}.`,
    missed: "No te alcancé a oír",
    hearing: "Te escucho",
    stopped: "En pausa",
    waiting: "Aquí sigo",
    tapAndSay: (word: string) => `Toca el micrófono y di: ${word}.`,
    nowYouWord: "Ahora dila tú.",
    wholeListen: {
      title: "¡Eso es!",
      description: "Escucha la frase completa una vez más.",
    },
    wholeSay: {
      title: "¡Ahora completa!",
      description: "Ya te salió por partes. Dila toda junta.",
    },
    almost: "¡Casi! Escúchala otra vez",
    missingBit: "Te faltó un pedacito. Luego dila completa.",
    watchMarked: "Fíjate en las palabras resaltadas.",
    slower: "Luego dila un poco más despacio.",
    replies: "Pío te contesta",
    listenThenAnswer: (language: string) =>
      `Escucha y luego contéstame en ${language}.`,
    howItSounds: {
      title: "Escucha cómo suena",
      description: "Luego te toca a ti.",
    },
    tuning: { title: "Ya casi…", description: "Estoy afinando la voz." },
    closer: "Dilo otra vez, un poquito más cerca del micrófono.",
    repeat: "Repite la frase. Si prefieres otra, dila en tu idioma.",
    answerIn: (language: string) =>
      `Contéstame en ${language}. Si te atoras, dilo en tu idioma.`,
    calm: "Habla con calma. Cuando hagas una pausa, sigo yo.",
    accepted: {
      title: "¡Bien dicho!",
      description: "Se te entendió todo. Vamos por otra.",
    },
    stoppedPhrase: "Toca el micrófono para seguir con tu frase.",
    stoppedFree: "Toca el micrófono cuando quieras seguir.",
    waitedPhrase: "Me quedé esperando. Toca el micrófono y repite la frase.",
    waitedFree: "Me quedé esperando. Toca el micrófono cuando quieras seguir.",
    onceMore: "Va de nuevo",
    onceMoreMany: "Dila con calma. Si prefieres, toca «Otra frase».",
    onceMoreCalm: "Dila completa, con calma.",
    nowYou: {
      title: "¡Ahora dilo tú!",
      description: "Repite la frase completa.",
    },
    keepTalking: "Sigamos platicando",
    ask: "¿Qué quieres decir?",
    askHow: "Dilo en tu idioma y te enseño cómo se dice.",
    streak: (days: number) => `Llevas ${days} días seguidos.`,
  },
  mic: {
    speak: "Hablar",
    done: "Listo",
    myTurn: "Mi turno",
    cancel: "Cancelar",
    wait: "Un momento…",
  },
  examples: [
    "Quiero pedir un café, por favor",
    "¿Dónde está el baño?",
    "Mucho gusto, ¿cómo te llamas?",
    "La cuenta, por favor",
    "¿Cuánto cuesta esto?",
    "No entiendo, ¿puedes repetirlo?",
    "Buenos días, ¿cómo estás?",
  ],
  announce: {
    permission: "Dale permiso al micrófono.",
    accepted: (n: number) =>
      `Bien dicho. Llevas ${n} ${n === 1 ? "frase" : "frases"} hoy.`,
    almost: "Casi.",
    practise: (words: string) => `Practica: ${words}.`,
    paused: "Pío está en pausa.",
  },
  loading: "Preparando Pío…",
  stars: {
    title: "Frases logradas hoy",
    done: (n: number): string =>
      n === 1 ? "frase lograda" : "frases logradas",
    today: "hoy",
    days: (n: number) => `${n} días seguidos`,
    streak: (n: number) => `Llevas ${n} días seguidos.`,
  },
  changeLanguages: (native: string, target: string) =>
    `Cambiar idiomas. Ahora: ${native} a ${target}`,
  welcome: {
    hello: "Hola, soy",
    intro: "Aprende un idioma hablando, una frase a la vez.",
    steps: [
      "Di algo en tu idioma.",
      "Escucha cómo se dice y repítelo.",
      "Te ayudo a pulirlo, sin prisa.",
    ],
    choose: "Elige tus idiomas",
  },
  tryWith: "Prueba con:",
  youSaid: "Dijiste",
  recap: {
    title: "Tu práctica de hoy",
    hardOne: "Te costó: ",
    hardMany: "Te costaron: ",
  },
  pending: "Te quedó pendiente:",
  review: "Repasarla",
  listenAgain: "Volver a escuchar",
  retry: "Volver a intentar",
  changeLanguage: "Cambiar idioma",
  checking: "Revisando…",
  hint: "Toca una vez. Yo escucho, contesto y vuelvo a escuchar.",
  pause: "Pausar",
  another: "Otra frase",
  restart: "Empezar de nuevo",
  help: {
    summary: "Ayuda y privacidad",
    steps: [
      "Di algo en tu idioma. Pío lo traduce y te lo dice.",
      "Repítelo. Pío te ayuda hasta que se entienda todo.",
      "Si hablas en el idioma que aprendes, Pío te contesta y conversan.",
      "Para oír la frase otra vez, di «repítelo» o toca Escuchar.",
    ],
    microphone:
      "El micrófono se enciende al tocar Hablar y vuelve a encenderse solo entre turnos. Pausar, quedarte en silencio o salir de esta pestaña lo apaga.",
    policy: "Política de privacidad",
    privacy:
      "Pío revisa qué tan claro se entendió cada palabra; no mide sonidos exactos. Tu voz se envía a ElevenLabs para entenderte; el texto, y el audio de una palabra que no salió, a OpenAI para traducir, conversar y darte un consejo. Nada se guarda en una base de datos. Tus idiomas y estrellas se quedan en este navegador.",
  },
  settings: { title: "Tus idiomas", close: "Cerrar idiomas" },
  access: {
    label: "Código de acceso",
    entering: "Entrando…",
    enter: "Entrar",
    failed: "Ese código no funcionó. Revísalo o espera un minuto.",
  },
  card: {
    label: "Frase de práctica",
    wellSaid: "Bien dicho",
    yourPhrase: (language: string) => `Tu frase en ${language}`,
    score: (n: number) => `Claridad: ${n} de 10`,
    leftOut: "Te faltó decir:",
    polish: "Hay que pulir:",
    unclearOne: "No se entendió bien:",
    unclearMany: "No se entendieron bien:",
    listen: "Escuchar",
    slow: "Despacio",
  },
  form: {
    mine: "Mi idioma",
    pickMine: "Selecciona tu idioma",
    practise: "Quiero practicar",
    pick: "Selecciona un idioma",
    different: "Elige un idioma distinto al tuyo para practicar.",
    remember:
      "Recordaremos tu selección en este navegador. Puedes cambiarla cuando quieras.",
    save: "Guardar y continuar",
  },
};
export type Copy = typeof es;

const en: Copy = {
  quote: (word) => `“${word}”`,
  errors: {
    "phrase-too-long": "That one was a bit long. Try a shorter phrase.",
    NotAllowedError:
      "I need permission to hear you. Allow the microphone in your browser and try again.",
    NotFoundError: "I can't find a microphone. Connect one and try again.",
    NotReadableError:
      "Another app is using your microphone. Close it and try again.",
    "unsupported-microphone":
      "This browser won't let me use the microphone. Open me in an up-to-date Safari or Chrome.",
    "not-configured": "I don't speak that language yet. Pick another for now.",
    "provider-busy": "I'm a bit swamped. Give me a few seconds and try again.",
    "provider-quota":
      "I ran out of voice credits. They need to be topped up in ElevenLabs to continue.",
    "provider-timeout": "I took too long. Shall we try again?",
    "assessment-incomplete":
      "I didn't catch the whole phrase. Say it again, all of it.",
    "assessment-unavailable":
      "I didn't hear you clearly. Say it again whenever you like.",
    "access-required": "Your session ended. Enter your code to continue.",
    "too-many-requests":
      "We're going very fast. Rest a minute and we'll go on.",
    "invalid-audio": "The recording got cut off. Say it again.",
    "capture-failed": "The microphone cut out. Tap Speak and say it again.",
    TypeError:
      "It looks like the internet dropped. Check your connection and we'll try again.",
    TimeoutError:
      "It looks like the internet is slow. Check your connection and we'll try again.",
  },
  failed: "Something went wrong on my side. Shall we try again?",
  voiceFailed: "I couldn't play the voice. Tap to try again.",
  soundBlocked: "Your browser has sound blocked. Tap to hear the phrase.",
  saveFailed: "I couldn't save your languages for your next visit.",
  stumble: "We hit a bump",
  connection: {
    checking: {
      title: "Waking Pío up…",
      description: "This can take a few seconds.",
    },
    offline: {
      title: "I can't connect",
      description:
        "Check your internet and try again. Your languages are still saved.",
    },
    access: {
      title: "Hi! I need your code",
      description: "Enter it to start practising.",
    },
    unconfigured: {
      title: "I don't speak that language yet",
      description: "Pick another language for now, at the top right.",
    },
  },
  session: {
    fallbackLanguage: "the language you're learning",
    permission: {
      title: "Let me hear you",
      description: "Allow the microphone in your browser's prompt.",
    },
    thinking: { title: "Let me think…", description: "Just a second." },
    place: (at, total) => `Word ${at} of ${total}.`,
    again: "Once more, slowly",
    parts: "Let's take it in parts",
    listenTo: (named) => `Listen: ${named}.`,
    sayOnly: (named) => `Say only: ${named}.`,
    missed: "I didn't catch you",
    hearing: "I'm listening",
    stopped: "Paused",
    waiting: "Still here",
    tapAndSay: (word) => `Tap the microphone and say: ${word}.`,
    nowYouWord: "Now you say it.",
    wholeListen: {
      title: "That's it!",
      description: "Listen to the whole phrase once more.",
    },
    wholeSay: {
      title: "Now the whole thing!",
      description: "You got the parts. Say it all together.",
    },
    almost: "Almost! Listen again",
    missingBit: "A little bit was missing. Then say all of it.",
    watchMarked: "Watch the highlighted words.",
    slower: "Then say it a little more slowly.",
    replies: "Pío answers you",
    listenThenAnswer: (language) => `Listen, then answer me in ${language}.`,
    howItSounds: {
      title: "Listen to how it sounds",
      description: "Then it's your turn.",
    },
    tuning: { title: "Almost there…", description: "I'm tuning my voice." },
    closer: "Say it again, a little closer to the microphone.",
    repeat:
      "Repeat the phrase. If you'd rather have another, say it in your language.",
    answerIn: (language) =>
      `Answer me in ${language}. If you get stuck, say it in your language.`,
    calm: "Speak calmly. When you pause, I'll take over.",
    accepted: {
      title: "Well said!",
      description: "I understood everything. Let's do another.",
    },
    stoppedPhrase: "Tap the microphone to go on with your phrase.",
    stoppedFree: "Tap the microphone whenever you want to go on.",
    waitedPhrase: "I was waiting. Tap the microphone and repeat the phrase.",
    waitedFree: "I was waiting. Tap the microphone whenever you want to go on.",
    onceMore: "Once more",
    onceMoreMany: "Say it calmly. If you'd rather, tap “Another phrase”.",
    onceMoreCalm: "Say all of it, calmly.",
    nowYou: {
      title: "Now you say it!",
      description: "Repeat the whole phrase.",
    },
    keepTalking: "Let's keep chatting",
    ask: "What do you want to say?",
    askHow: "Say it in your language and I'll show you how it's said.",
    streak: (days) => `You're on a ${days}-day streak.`,
  },
  mic: {
    speak: "Speak",
    done: "Done",
    myTurn: "My turn",
    cancel: "Cancel",
    wait: "One moment…",
  },
  examples: [
    "I'd like to order a coffee, please",
    "Where is the bathroom?",
    "Nice to meet you, what's your name?",
    "The check, please",
    "How much does this cost?",
    "I don't understand, can you repeat that?",
    "Good morning, how are you?",
  ],
  announce: {
    permission: "Allow the microphone.",
    accepted: (n) =>
      `Well said. That's ${n} ${n === 1 ? "phrase" : "phrases"} today.`,
    almost: "Almost.",
    practise: (words) => `Practise: ${words}.`,
    paused: "Pío is paused.",
  },
  loading: "Getting Pío ready…",
  stars: {
    title: "Phrases you got today",
    done: (n) => (n === 1 ? "phrase done" : "phrases done"),
    today: "today",
    days: (n) => `${n} days in a row`,
    streak: (n) => `You're on a ${n}-day streak.`,
  },
  changeLanguages: (native, target) =>
    `Change languages. Now: ${native} to ${target}`,
  welcome: {
    hello: "Hi, I'm",
    intro: "Learn a language by speaking, one phrase at a time.",
    steps: [
      "Say something in your language.",
      "Hear how it's said and repeat it.",
      "I help you polish it, no rush.",
    ],
    choose: "Choose your languages",
  },
  tryWith: "Try:",
  youSaid: "You said",
  recap: {
    title: "Your practice today",
    hardOne: "This was hard: ",
    hardMany: "These were hard: ",
  },
  pending: "Still pending:",
  review: "Review it",
  listenAgain: "Listen again",
  retry: "Try again",
  changeLanguage: "Change language",
  checking: "Checking…",
  hint: "Tap once. I listen, answer and listen again.",
  pause: "Pause",
  another: "Another phrase",
  restart: "Start over",
  help: {
    summary: "Help and privacy",
    steps: [
      "Say something in your language. Pío translates it and says it to you.",
      "Repeat it. Pío helps you until everything is understood.",
      "If you speak in the language you're learning, Pío answers and you chat.",
      "To hear the phrase again, say “repeat it” or tap Listen.",
    ],
    microphone:
      "The microphone turns on when you tap Speak and comes back on by itself between turns. Pausing, staying silent or leaving this tab turns it off.",
    policy: "Privacy policy",
    privacy:
      "Pío checks how clearly each word came through; it doesn't measure exact sounds. Your voice is sent to ElevenLabs to understand you; the text, and the audio of a word that didn't come out, to OpenAI to translate, chat and give you a tip. Nothing is stored in a database. Your languages and stars stay in this browser.",
  },
  settings: { title: "Your languages", close: "Close languages" },
  access: {
    label: "Access code",
    entering: "Signing in…",
    enter: "Enter",
    failed: "That code didn't work. Check it or wait a minute.",
  },
  card: {
    label: "Practice phrase",
    wellSaid: "Well said",
    yourPhrase: (language) => `Your phrase in ${language}`,
    score: (n) => `Clarity: ${n} out of 10`,
    leftOut: "You left out:",
    polish: "To polish:",
    unclearOne: "This wasn't clear:",
    unclearMany: "These weren't clear:",
    listen: "Listen",
    slow: "Slowly",
  },
  form: {
    mine: "My language",
    pickMine: "Select your language",
    practise: "I want to practise",
    pick: "Select a language",
    different: "Pick a language different from yours to practise.",
    remember:
      "We'll remember your choice in this browser. You can change it any time.",
    save: "Save and continue",
  },
};

const de: Copy = {
  quote: (word) => `„${word}“`,
  errors: {
    "phrase-too-long":
      "Der war ein bisschen lang. Versuch es mit einem kürzeren Satz.",
    NotAllowedError:
      "Ich brauche die Erlaubnis, dich zu hören. Erlaube das Mikrofon in deinem Browser und versuch es noch einmal.",
    NotFoundError:
      "Ich finde kein Mikrofon. Schließ eins an und versuch es noch einmal.",
    NotReadableError:
      "Eine andere App benutzt dein Mikrofon. Schließ sie und versuch es noch einmal.",
    "unsupported-microphone":
      "Dieser Browser lässt mich das Mikrofon nicht benutzen. Öffne mich in einem aktuellen Safari oder Chrome.",
    "not-configured":
      "Diese Sprache spreche ich noch nicht. Wähl vorerst eine andere.",
    "provider-busy":
      "Ich bin gerade etwas überlastet. Gib mir ein paar Sekunden und versuch es noch einmal.",
    "provider-quota":
      "Mein Stimmguthaben ist aufgebraucht. Es muss bei ElevenLabs aufgeladen werden.",
    "provider-timeout":
      "Ich habe zu lange gebraucht. Versuchen wir es noch einmal?",
    "assessment-incomplete":
      "Ich habe nicht den ganzen Satz gehört. Sag ihn noch einmal, vollständig.",
    "assessment-unavailable":
      "Ich habe dich nicht klar gehört. Sag es noch einmal, wann du magst.",
    "access-required":
      "Deine Sitzung ist beendet. Gib deinen Code ein, um weiterzumachen.",
    "too-many-requests":
      "Wir sind sehr schnell. Ruh dich eine Minute aus, dann geht es weiter.",
    "invalid-audio": "Die Aufnahme wurde abgeschnitten. Sag es noch einmal.",
    "capture-failed":
      "Das Mikrofon ist ausgefallen. Tippe auf Sprechen und sag es noch einmal.",
    TypeError:
      "Das Internet scheint weg zu sein. Prüf deine Verbindung, dann versuchen wir es noch einmal.",
    TimeoutError:
      "Das Internet scheint langsam zu sein. Prüf deine Verbindung, dann versuchen wir es noch einmal.",
  },
  failed: "Bei mir ist etwas schiefgegangen. Versuchen wir es noch einmal?",
  voiceFailed:
    "Ich konnte die Stimme nicht abspielen. Tippe, um es noch einmal zu versuchen.",
  soundBlocked: "Dein Browser blockiert den Ton. Tippe, um den Satz zu hören.",
  saveFailed:
    "Ich konnte deine Sprachen nicht für den nächsten Besuch speichern.",
  stumble: "Wir sind gestolpert",
  connection: {
    checking: {
      title: "Pío wacht auf…",
      description: "Das kann ein paar Sekunden dauern.",
    },
    offline: {
      title: "Ich kann mich nicht verbinden",
      description:
        "Prüf dein Internet und versuch es noch einmal. Deine Sprachen sind noch gespeichert.",
    },
    access: {
      title: "Hallo! Ich brauche deinen Code",
      description: "Gib ihn ein, um mit dem Üben anzufangen.",
    },
    unconfigured: {
      title: "Diese Sprache spreche ich noch nicht",
      description: "Wähl vorerst oben rechts eine andere Sprache.",
    },
  },
  session: {
    fallbackLanguage: "der Sprache, die du lernst",
    permission: {
      title: "Lass mich dich hören",
      description: "Erlaube das Mikrofon im Hinweis deines Browsers.",
    },
    thinking: { title: "Lass mich überlegen…", description: "Einen Moment." },
    place: (at, total) => `Wort ${at} von ${total}.`,
    again: "Noch einmal, ganz langsam",
    parts: "Schritt für Schritt",
    listenTo: (named) => `Hör zu: ${named}.`,
    sayOnly: (named) => `Sag nur: ${named}.`,
    missed: "Ich habe dich nicht gehört",
    hearing: "Ich höre dir zu",
    stopped: "Pausiert",
    waiting: "Ich bin noch da",
    tapAndSay: (word) => `Tippe auf das Mikrofon und sag: ${word}.`,
    nowYouWord: "Jetzt sagst du es.",
    wholeListen: {
      title: "Genau so!",
      description: "Hör dir den ganzen Satz noch einmal an.",
    },
    wholeSay: {
      title: "Jetzt den ganzen Satz!",
      description: "Die Teile hast du geschafft. Sag jetzt alles zusammen.",
    },
    almost: "Fast! Hör ihn dir noch einmal an",
    missingBit: "Ein Stückchen hat gefehlt. Sag ihn danach vollständig.",
    watchMarked: "Achte auf die markierten Wörter.",
    slower: "Sag ihn danach etwas langsamer.",
    replies: "Pío antwortet dir",
    listenThenAnswer: (language) =>
      `Hör zu und antworte mir dann auf ${language}.`,
    howItSounds: {
      title: "Hör dir an, wie es klingt",
      description: "Danach bist du dran.",
    },
    tuning: { title: "Gleich…", description: "Ich stimme meine Stimme." },
    closer: "Sag es noch einmal, etwas näher am Mikrofon.",
    repeat:
      "Wiederhol den Satz. Wenn du einen anderen möchtest, sag ihn in deiner Sprache.",
    answerIn: (language) =>
      `Antworte mir auf ${language}. Wenn du nicht weiterkommst, sag es in deiner Sprache.`,
    calm: "Sprich in Ruhe. Wenn du eine Pause machst, bin ich dran.",
    accepted: {
      title: "Gut gesagt!",
      description: "Ich habe alles verstanden. Auf zum nächsten.",
    },
    stoppedPhrase: "Tippe auf das Mikrofon, um mit deinem Satz weiterzumachen.",
    stoppedFree: "Tippe auf das Mikrofon, wann immer du weitermachen möchtest.",
    waitedPhrase:
      "Ich habe gewartet. Tippe auf das Mikrofon und wiederhol den Satz.",
    waitedFree:
      "Ich habe gewartet. Tippe auf das Mikrofon, wann immer du weitermachen möchtest.",
    onceMore: "Noch einmal",
    onceMoreMany: "Sag ihn in Ruhe. Wenn du magst, tippe auf „Anderer Satz“.",
    onceMoreCalm: "Sag ihn vollständig, in Ruhe.",
    nowYou: {
      title: "Jetzt du!",
      description: "Wiederhol den ganzen Satz.",
    },
    keepTalking: "Plaudern wir weiter",
    ask: "Was möchtest du sagen?",
    askHow: "Sag es in deiner Sprache und ich zeige dir, wie man es sagt.",
    streak: (days) => `Du bist seit ${days} Tagen in Folge dabei.`,
  },
  mic: {
    speak: "Sprechen",
    done: "Fertig",
    myTurn: "Ich bin dran",
    cancel: "Abbrechen",
    wait: "Einen Moment…",
  },
  examples: [
    "Ich möchte bitte einen Kaffee bestellen",
    "Wo ist die Toilette?",
    "Freut mich, wie heißt du?",
    "Die Rechnung, bitte",
    "Wie viel kostet das?",
    "Ich verstehe nicht, kannst du das wiederholen?",
    "Guten Morgen, wie geht es dir?",
  ],
  announce: {
    permission: "Erlaube das Mikrofon.",
    accepted: (n) =>
      `Gut gesagt. Das ${n === 1 ? "ist" : "sind"} heute ${n} ${n === 1 ? "Satz" : "Sätze"}.`,
    almost: "Fast.",
    practise: (words) => `Übe: ${words}.`,
    paused: "Pío ist pausiert.",
  },
  loading: "Pío wird vorbereitet…",
  stars: {
    title: "Heute geschaffte Sätze",
    done: (n) => (n === 1 ? "Satz geschafft" : "Sätze geschafft"),
    today: "heute",
    days: (n) => `${n} Tage in Folge`,
    streak: (n) => `Du bist seit ${n} Tagen in Folge dabei.`,
  },
  changeLanguages: (native, target) =>
    `Sprachen ändern. Jetzt: ${native} zu ${target}`,
  welcome: {
    hello: "Hallo, ich bin",
    intro: "Lern eine Sprache durch Sprechen, einen Satz nach dem anderen.",
    steps: [
      "Sag etwas in deiner Sprache.",
      "Hör dir an, wie man es sagt, und wiederhol es.",
      "Ich helfe dir beim Feinschliff, ganz ohne Eile.",
    ],
    choose: "Wähl deine Sprachen",
  },
  tryWith: "Versuch es mit:",
  youSaid: "Du hast gesagt",
  recap: {
    title: "Dein Üben heute",
    hardOne: "Das fiel dir schwer: ",
    hardMany: "Die fielen dir schwer: ",
  },
  pending: "Noch offen:",
  review: "Wiederholen",
  listenAgain: "Noch einmal anhören",
  retry: "Noch einmal versuchen",
  changeLanguage: "Sprache ändern",
  checking: "Ich prüfe…",
  hint: "Tippe einmal. Ich höre zu, antworte und höre wieder zu.",
  pause: "Pausieren",
  another: "Anderer Satz",
  restart: "Von vorn anfangen",
  help: {
    summary: "Hilfe und Datenschutz",
    steps: [
      "Sag etwas in deiner Sprache. Pío übersetzt es und sagt es dir.",
      "Wiederhol es. Pío hilft dir, bis alles verständlich ist.",
      "Wenn du in der Sprache sprichst, die du lernst, antwortet Pío und ihr unterhaltet euch.",
      "Um den Satz noch einmal zu hören, sag „wiederhol das“ oder tippe auf Anhören.",
    ],
    microphone:
      "Das Mikrofon geht an, wenn du auf Sprechen tippst, und schaltet sich zwischen den Runden von selbst wieder ein. Pausieren, Schweigen oder das Verlassen dieses Tabs schaltet es aus.",
    policy: "Datenschutzerklärung",
    privacy:
      "Pío prüft, wie klar jedes Wort zu verstehen war; exakte Laute misst es nicht. Deine Stimme wird an ElevenLabs gesendet, um dich zu verstehen; der Text und der Ton eines Wortes, das nicht geklappt hat, an OpenAI, um zu übersetzen, zu plaudern und dir einen Tipp zu geben. Nichts wird in einer Datenbank gespeichert. Deine Sprachen und Sterne bleiben in diesem Browser.",
  },
  settings: { title: "Deine Sprachen", close: "Sprachen schließen" },
  access: {
    label: "Zugangscode",
    entering: "Anmelden…",
    enter: "Anmelden",
    failed: "Der Code hat nicht funktioniert. Prüf ihn oder warte eine Minute.",
  },
  card: {
    label: "Übungssatz",
    wellSaid: "Gut gesagt",
    yourPhrase: (language) => `Dein Satz auf ${language}`,
    score: (n) => `Verständlichkeit: ${n} von 10`,
    leftOut: "Das hat gefehlt:",
    polish: "Zum Feilen:",
    unclearOne: "Das war nicht gut zu verstehen:",
    unclearMany: "Die waren nicht gut zu verstehen:",
    listen: "Anhören",
    slow: "Langsam",
  },
  form: {
    mine: "Meine Sprache",
    pickMine: "Wähl deine Sprache",
    practise: "Ich möchte üben",
    pick: "Wähl eine Sprache",
    different: "Wähl zum Üben eine andere Sprache als deine eigene.",
    remember:
      "Wir merken uns deine Auswahl in diesem Browser. Du kannst sie jederzeit ändern.",
    save: "Speichern und weiter",
  },
};

const fr: Copy = {
  quote: (word) => `« ${word} »`,
  errors: {
    "phrase-too-long":
      "Celle-là était un peu longue. Essaie une phrase plus courte.",
    NotAllowedError:
      "J'ai besoin de ta permission pour t'écouter. Autorise le micro dans ton navigateur et réessaie.",
    NotFoundError: "Je ne trouve aucun micro. Branches-en un et réessaie.",
    NotReadableError:
      "Une autre appli utilise ton micro. Ferme-la et réessaie.",
    "unsupported-microphone":
      "Ce navigateur ne me laisse pas utiliser le micro. Ouvre-moi dans Safari ou Chrome à jour.",
    "not-configured":
      "Je ne parle pas encore cette langue. Choisis-en une autre pour l'instant.",
    "provider-busy":
      "Je suis un peu débordé. Donne-moi quelques secondes et réessaie.",
    "provider-quota":
      "Je n'ai plus de crédits de voix. Il faut les recharger dans ElevenLabs pour continuer.",
    "provider-timeout": "J'ai mis trop de temps. On réessaie ?",
    "assessment-incomplete":
      "Je n'ai pas entendu toute la phrase. Redis-la en entier.",
    "assessment-unavailable":
      "Je ne t'ai pas entendu clairement. Redis-le quand tu veux.",
    "access-required":
      "Ta session s'est fermée. Saisis ton code pour continuer.",
    "too-many-requests":
      "On va très vite. Repose-toi une petite minute et on continue.",
    "invalid-audio": "L'enregistrement a été coupé. Redis-le.",
    "capture-failed": "Le micro a coupé. Touche Parler et redis-le.",
    TypeError:
      "On dirait qu'internet est parti. Vérifie ta connexion et on réessaie.",
    TimeoutError:
      "On dirait qu'internet est lent. Vérifie ta connexion et on réessaie.",
  },
  failed: "Quelque chose a raté de mon côté. On réessaie ?",
  voiceFailed: "Je n'ai pas pu lire la voix. Touche pour réessayer.",
  soundBlocked: "Ton navigateur bloque le son. Touche pour entendre la phrase.",
  saveFailed:
    "Je n'ai pas pu enregistrer tes langues pour la prochaine visite.",
  stumble: "On a trébuché",
  connection: {
    checking: {
      title: "Je réveille Pío…",
      description: "Cela peut prendre quelques secondes.",
    },
    offline: {
      title: "Je n'arrive pas à me connecter",
      description:
        "Vérifie ton internet et réessaie. Tes langues sont toujours enregistrées.",
    },
    access: {
      title: "Salut ! J'ai besoin de ton code",
      description: "Saisis-le pour commencer à t'entraîner.",
    },
    unconfigured: {
      title: "Je ne parle pas encore cette langue",
      description: "Choisis une autre langue pour l'instant, en haut à droite.",
    },
  },
  session: {
    fallbackLanguage: "la langue que tu apprends",
    permission: {
      title: "Laisse-moi t'écouter",
      description: "Autorise le micro dans le message de ton navigateur.",
    },
    thinking: {
      title: "Laisse-moi réfléchir…",
      description: "Une petite seconde.",
    },
    place: (at, total) => `Mot ${at} sur ${total}.`,
    again: "Encore une fois, tout doucement",
    parts: "Allons-y par morceaux",
    listenTo: (named) => `Écoute : ${named}.`,
    sayOnly: (named) => `Dis seulement : ${named}.`,
    missed: "Je ne t'ai pas entendu",
    hearing: "Je t'écoute",
    stopped: "En pause",
    waiting: "Je suis toujours là",
    tapAndSay: (word) => `Touche le micro et dis : ${word}.`,
    nowYouWord: "À toi de le dire.",
    wholeListen: {
      title: "C'est ça !",
      description: "Écoute la phrase entière encore une fois.",
    },
    wholeSay: {
      title: "Maintenant en entier !",
      description: "Tu l'as eue par morceaux. Dis-la d'un seul coup.",
    },
    almost: "Presque ! Écoute-la encore",
    missingBit: "Il manquait un petit bout. Ensuite, dis-la en entier.",
    watchMarked: "Regarde les mots surlignés.",
    slower: "Ensuite, dis-la un peu plus lentement.",
    replies: "Pío te répond",
    listenThenAnswer: (language) => `Écoute, puis réponds-moi en ${language}.`,
    howItSounds: {
      title: "Écoute comment ça sonne",
      description: "Ensuite, c'est à toi.",
    },
    tuning: { title: "Presque…", description: "J'accorde ma voix." },
    closer: "Redis-le, un peu plus près du micro.",
    repeat:
      "Répète la phrase. Si tu en préfères une autre, dis-la dans ta langue.",
    answerIn: (language) =>
      `Réponds-moi en ${language}. Si tu bloques, dis-le dans ta langue.`,
    calm: "Parle calmement. Quand tu fais une pause, je prends la suite.",
    accepted: {
      title: "Bien dit !",
      description: "J'ai tout compris. Passons à une autre.",
    },
    stoppedPhrase: "Touche le micro pour continuer avec ta phrase.",
    stoppedFree: "Touche le micro quand tu veux continuer.",
    waitedPhrase: "Je t'attendais. Touche le micro et répète la phrase.",
    waitedFree: "Je t'attendais. Touche le micro quand tu veux continuer.",
    onceMore: "On recommence",
    onceMoreMany: "Dis-la calmement. Si tu préfères, touche « Autre phrase ».",
    onceMoreCalm: "Dis-la en entier, calmement.",
    nowYou: {
      title: "À toi de la dire !",
      description: "Répète la phrase entière.",
    },
    keepTalking: "Continuons à discuter",
    ask: "Que veux-tu dire ?",
    askHow: "Dis-le dans ta langue et je te montre comment ça se dit.",
    streak: (days) => `Ça fait ${days} jours de suite.`,
  },
  mic: {
    speak: "Parler",
    done: "Terminé",
    myTurn: "À moi",
    cancel: "Annuler",
    wait: "Un instant…",
  },
  examples: [
    "Je voudrais commander un café, s'il vous plaît",
    "Où sont les toilettes ?",
    "Enchanté, comment tu t'appelles ?",
    "L'addition, s'il vous plaît",
    "Combien ça coûte ?",
    "Je ne comprends pas, tu peux répéter ?",
    "Bonjour, comment ça va ?",
  ],
  announce: {
    permission: "Autorise le micro.",
    accepted: (n) =>
      `Bien dit. Ça fait ${n} ${n === 1 ? "phrase" : "phrases"} aujourd'hui.`,
    almost: "Presque.",
    practise: (words) => `Entraîne-toi sur : ${words}.`,
    paused: "Pío est en pause.",
  },
  loading: "Pío se prépare…",
  stars: {
    title: "Phrases réussies aujourd'hui",
    done: (n) => (n === 1 ? "phrase réussie" : "phrases réussies"),
    today: "aujourd'hui",
    days: (n) => `${n} jours de suite`,
    streak: (n) => `Ça fait ${n} jours de suite.`,
  },
  changeLanguages: (native, target) =>
    `Changer de langues. Maintenant : ${native} vers ${target}`,
  welcome: {
    hello: "Salut, je suis",
    intro: "Apprends une langue en parlant, une phrase à la fois.",
    steps: [
      "Dis quelque chose dans ta langue.",
      "Écoute comment ça se dit et répète.",
      "Je t'aide à le peaufiner, sans te presser.",
    ],
    choose: "Choisis tes langues",
  },
  tryWith: "Essaie avec :",
  youSaid: "Tu as dit",
  recap: {
    title: "Ton entraînement du jour",
    hardOne: "Celui-ci t'a résisté : ",
    hardMany: "Ceux-ci t'ont résisté : ",
  },
  pending: "Il te reste :",
  review: "La revoir",
  listenAgain: "Réécouter",
  retry: "Réessayer",
  changeLanguage: "Changer de langue",
  checking: "Je vérifie…",
  hint: "Touche une fois. J'écoute, je réponds et j'écoute à nouveau.",
  pause: "Pause",
  another: "Autre phrase",
  restart: "Recommencer",
  help: {
    summary: "Aide et confidentialité",
    steps: [
      "Dis quelque chose dans ta langue. Pío le traduit et te le dit.",
      "Répète-le. Pío t'aide jusqu'à ce que tout soit compris.",
      "Si tu parles dans la langue que tu apprends, Pío te répond et vous discutez.",
      "Pour réentendre la phrase, dis « répète » ou touche Écouter.",
    ],
    microphone:
      "Le micro s'allume quand tu touches Parler et se rallume tout seul entre les tours. Mettre en pause, rester silencieux ou quitter cet onglet l'éteint.",
    policy: "Politique de confidentialité",
    privacy:
      "Pío vérifie si chaque mot a été bien compris ; il ne mesure pas les sons exacts. Ta voix est envoyée à ElevenLabs pour te comprendre ; le texte, et le son d'un mot qui n'est pas sorti, à OpenAI pour traduire, discuter et te donner un conseil. Rien n'est enregistré dans une base de données. Tes langues et tes étoiles restent dans ce navigateur.",
  },
  settings: { title: "Tes langues", close: "Fermer les langues" },
  access: {
    label: "Code d'accès",
    entering: "Connexion…",
    enter: "Entrer",
    failed: "Ce code n'a pas marché. Vérifie-le ou attends une minute.",
  },
  card: {
    label: "Phrase d'entraînement",
    wellSaid: "Bien dit",
    yourPhrase: (language) => `Ta phrase en ${language}`,
    score: (n) => `Clarté : ${n} sur 10`,
    leftOut: "Il te manquait :",
    polish: "À peaufiner :",
    unclearOne: "Pas bien compris :",
    unclearMany: "Pas bien compris :",
    listen: "Écouter",
    slow: "Lentement",
  },
  form: {
    mine: "Ma langue",
    pickMine: "Sélectionne ta langue",
    practise: "Je veux pratiquer",
    pick: "Sélectionne une langue",
    different: "Choisis une langue différente de la tienne pour pratiquer.",
    remember:
      "Nous retiendrons ton choix dans ce navigateur. Tu peux le changer quand tu veux.",
    save: "Enregistrer et continuer",
  },
};

const it: Copy = {
  quote: (word) => `«${word}»`,
  errors: {
    "phrase-too-long":
      "Questa era un po' lunga. Prova con una frase più corta.",
    NotAllowedError:
      "Mi serve il permesso per ascoltarti. Consenti il microfono nel browser e riprova.",
    NotFoundError: "Non trovo nessun microfono. Collegane uno e riprova.",
    NotReadableError:
      "Un'altra app sta usando il tuo microfono. Chiudila e riprova.",
    "unsupported-microphone":
      "Questo browser non mi lascia usare il microfono. Aprimi in Safari o Chrome aggiornato.",
    "not-configured":
      "Non parlo ancora quella lingua. Per ora scegline un'altra.",
    "provider-busy":
      "Sono un po' sovraccarico. Dammi qualche secondo e riprova.",
    "provider-quota":
      "Ho finito i crediti della voce. Bisogna ricaricarli su ElevenLabs per continuare.",
    "provider-timeout": "Ci ho messo troppo. Riproviamo?",
    "assessment-incomplete":
      "Non ho sentito tutta la frase. Dilla di nuovo, per intero.",
    "assessment-unavailable":
      "Non ti ho sentito bene. Dillo di nuovo quando vuoi.",
    "access-required":
      "La tua sessione si è chiusa. Scrivi il tuo codice per continuare.",
    "too-many-requests":
      "Stiamo andando molto veloci. Riposa un minutino e continuiamo.",
    "invalid-audio": "La registrazione si è interrotta. Dillo di nuovo.",
    "capture-failed":
      "Il microfono si è interrotto. Tocca Parla e dillo di nuovo.",
    TypeError:
      "Sembra che internet sia saltato. Controlla la connessione e riproviamo.",
    TimeoutError:
      "Sembra che internet sia lento. Controlla la connessione e riproviamo.",
  },
  failed: "Qualcosa mi è andato storto. Riproviamo?",
  voiceFailed: "Non sono riuscito a riprodurre la voce. Tocca per riprovare.",
  soundBlocked:
    "Il tuo browser ha l'audio bloccato. Tocca per sentire la frase.",
  saveFailed:
    "Non sono riuscito a salvare le tue lingue per la prossima visita.",
  stumble: "Abbiamo avuto un intoppo",
  connection: {
    checking: {
      title: "Sto svegliando Pío…",
      description: "Può volerci qualche secondo.",
    },
    offline: {
      title: "Non riesco a connettermi",
      description:
        "Controlla internet e riprova. Le tue lingue sono ancora salvate.",
    },
    access: {
      title: "Ciao! Mi serve il tuo codice",
      description: "Scrivilo per cominciare a esercitarti.",
    },
    unconfigured: {
      title: "Non parlo ancora quella lingua",
      description: "Per ora scegli un'altra lingua, in alto a destra.",
    },
  },
  session: {
    fallbackLanguage: "la lingua che stai imparando",
    permission: {
      title: "Lasciati ascoltare",
      description: "Consenti il microfono nell'avviso del tuo browser.",
    },
    thinking: { title: "Fammi pensare…", description: "Un secondino." },
    place: (at, total) => `Parola ${at} di ${total}.`,
    again: "Ancora una volta, piano piano",
    parts: "Andiamo per parti",
    listenTo: (named) => `Ascolta: ${named}.`,
    sayOnly: (named) => `Di' solo: ${named}.`,
    missed: "Non sono riuscito a sentirti",
    hearing: "Ti ascolto",
    stopped: "In pausa",
    waiting: "Sono ancora qui",
    tapAndSay: (word) => `Tocca il microfono e di': ${word}.`,
    nowYouWord: "Ora dilla tu.",
    wholeListen: {
      title: "Ecco!",
      description: "Ascolta la frase completa ancora una volta.",
    },
    wholeSay: {
      title: "Ora tutta intera!",
      description: "A pezzi ti è già venuta. Dilla tutta insieme.",
    },
    almost: "Quasi! Ascoltala di nuovo",
    missingBit: "Ti è mancato un pezzetto. Poi dilla per intero.",
    watchMarked: "Fai attenzione alle parole evidenziate.",
    slower: "Poi dilla un po' più lentamente.",
    replies: "Pío ti risponde",
    listenThenAnswer: (language) => `Ascolta e poi rispondimi in ${language}.`,
    howItSounds: {
      title: "Ascolta come suona",
      description: "Poi tocca a te.",
    },
    tuning: {
      title: "Ci siamo quasi…",
      description: "Sto accordando la voce.",
    },
    closer: "Dillo di nuovo, un po' più vicino al microfono.",
    repeat:
      "Ripeti la frase. Se ne preferisci un'altra, dilla nella tua lingua.",
    answerIn: (language) =>
      `Rispondimi in ${language}. Se ti blocchi, dillo nella tua lingua.`,
    calm: "Parla con calma. Quando fai una pausa, continuo io.",
    accepted: {
      title: "Ben detto!",
      description: "Ho capito tutto. Passiamo a un'altra.",
    },
    stoppedPhrase: "Tocca il microfono per continuare con la tua frase.",
    stoppedFree: "Tocca il microfono quando vuoi continuare.",
    waitedPhrase: "Ti stavo aspettando. Tocca il microfono e ripeti la frase.",
    waitedFree:
      "Ti stavo aspettando. Tocca il microfono quando vuoi continuare.",
    onceMore: "Ancora una volta",
    onceMoreMany: "Dilla con calma. Se preferisci, tocca «Altra frase».",
    onceMoreCalm: "Dilla per intero, con calma.",
    nowYou: {
      title: "Ora dillo tu!",
      description: "Ripeti la frase completa.",
    },
    keepTalking: "Continuiamo a chiacchierare",
    ask: "Cosa vuoi dire?",
    askHow: "Dillo nella tua lingua e ti insegno come si dice.",
    streak: (days) => `Sei a ${days} giorni di fila.`,
  },
  mic: {
    speak: "Parla",
    done: "Fatto",
    myTurn: "Tocca a me",
    cancel: "Annulla",
    wait: "Un momento…",
  },
  examples: [
    "Vorrei ordinare un caffè, per favore",
    "Dov'è il bagno?",
    "Piacere, come ti chiami?",
    "Il conto, per favore",
    "Quanto costa questo?",
    "Non capisco, puoi ripetere?",
    "Buongiorno, come stai?",
  ],
  announce: {
    permission: "Consenti il microfono.",
    accepted: (n) =>
      `Ben detto. Oggi sei a ${n} ${n === 1 ? "frase" : "frasi"}.`,
    almost: "Quasi.",
    practise: (words) => `Esercitati su: ${words}.`,
    paused: "Pío è in pausa.",
  },
  loading: "Sto preparando Pío…",
  stars: {
    title: "Frasi riuscite oggi",
    done: (n) => (n === 1 ? "frase riuscita" : "frasi riuscite"),
    today: "oggi",
    days: (n) => `${n} giorni di fila`,
    streak: (n) => `Sei a ${n} giorni di fila.`,
  },
  changeLanguages: (native, target) =>
    `Cambia lingue. Ora: ${native} verso ${target}`,
  welcome: {
    hello: "Ciao, sono",
    intro: "Impara una lingua parlando, una frase alla volta.",
    steps: [
      "Di' qualcosa nella tua lingua.",
      "Ascolta come si dice e ripetilo.",
      "Ti aiuto a rifinirlo, senza fretta.",
    ],
    choose: "Scegli le tue lingue",
  },
  tryWith: "Prova con:",
  youSaid: "Hai detto",
  recap: {
    title: "La tua pratica di oggi",
    hardOne: "Ti è costata: ",
    hardMany: "Ti sono costate: ",
  },
  pending: "Ti è rimasta in sospeso:",
  review: "Ripassala",
  listenAgain: "Riascolta",
  retry: "Riprova",
  changeLanguage: "Cambia lingua",
  checking: "Sto controllando…",
  hint: "Tocca una volta. Io ascolto, rispondo e torno ad ascoltare.",
  pause: "Pausa",
  another: "Altra frase",
  restart: "Ricomincia",
  help: {
    summary: "Aiuto e privacy",
    steps: [
      "Di' qualcosa nella tua lingua. Pío lo traduce e te lo dice.",
      "Ripetilo. Pío ti aiuta finché si capisce tutto.",
      "Se parli nella lingua che stai imparando, Pío ti risponde e conversate.",
      "Per risentire la frase, di' «ripetilo» o tocca Ascolta.",
    ],
    microphone:
      "Il microfono si accende quando tocchi Parla e si riaccende da solo tra un turno e l'altro. Mettere in pausa, restare in silenzio o uscire da questa scheda lo spegne.",
    policy: "Informativa sulla privacy",
    privacy:
      "Pío controlla quanto si è capita bene ogni parola; non misura i suoni esatti. La tua voce viene inviata a ElevenLabs per capirti; il testo, e l'audio di una parola che non è venuta, a OpenAI per tradurre, conversare e darti un consiglio. Niente viene salvato in un database. Le tue lingue e le tue stelle restano in questo browser.",
  },
  settings: { title: "Le tue lingue", close: "Chiudi lingue" },
  access: {
    label: "Codice di accesso",
    entering: "Accesso…",
    enter: "Entra",
    failed: "Quel codice non ha funzionato. Controllalo o aspetta un minuto.",
  },
  card: {
    label: "Frase di pratica",
    wellSaid: "Ben detto",
    yourPhrase: (language) => `La tua frase in ${language}`,
    score: (n) => `Chiarezza: ${n} su 10`,
    leftOut: "Ti è mancato:",
    polish: "Da rifinire:",
    unclearOne: "Non si è capita bene:",
    unclearMany: "Non si sono capite bene:",
    listen: "Ascolta",
    slow: "Lentamente",
  },
  form: {
    mine: "La mia lingua",
    pickMine: "Seleziona la tua lingua",
    practise: "Voglio esercitarmi in",
    pick: "Seleziona una lingua",
    different: "Scegli una lingua diversa dalla tua per esercitarti.",
    remember:
      "Ricorderemo la tua scelta in questo browser. Puoi cambiarla quando vuoi.",
    save: "Salva e continua",
  },
};

const pt: Copy = {
  quote: (word) => `«${word}»`,
  errors: {
    "phrase-too-long": "Essa ficou um pouco longa. Tente uma frase mais curta.",
    NotAllowedError:
      "Preciso de permissão para ouvir você. Permita o microfone no navegador e tente de novo.",
    NotFoundError: "Não encontro nenhum microfone. Conecte um e tente de novo.",
    NotReadableError:
      "Outro app está usando o seu microfone. Feche-o e tente de novo.",
    "unsupported-microphone":
      "Este navegador não me deixa usar o microfone. Abra-me no Safari ou Chrome atualizado.",
    "not-configured": "Ainda não falo esse idioma. Escolha outro por enquanto.",
    "provider-busy":
      "Estou um pouco sobrecarregado. Dê-me alguns segundos e tente de novo.",
    "provider-quota":
      "Acabaram os meus créditos de voz. É preciso recarregá-los no ElevenLabs para continuar.",
    "provider-timeout": "Demorei demais. Vamos tentar de novo?",
    "assessment-incomplete":
      "Não consegui ouvir a frase toda. Diga outra vez, completa.",
    "assessment-unavailable":
      "Não ouvi você com clareza. Diga outra vez quando quiser.",
    "access-required":
      "A sua sessão foi encerrada. Digite o seu código para continuar.",
    "too-many-requests":
      "Estamos indo muito rápido. Descanse um minutinho e continuamos.",
    "invalid-audio": "A gravação foi cortada. Diga outra vez.",
    "capture-failed": "O microfone cortou. Toque em Falar e diga outra vez.",
    TypeError:
      "Parece que a internet caiu. Verifique a conexão e tentamos de novo.",
    TimeoutError:
      "Parece que a internet está lenta. Verifique a conexão e tentamos de novo.",
  },
  failed: "Algo falhou do meu lado. Vamos tentar de novo?",
  voiceFailed: "Não consegui reproduzir a voz. Toque para tentar de novo.",
  soundBlocked:
    "O seu navegador está com o som bloqueado. Toque para ouvir a frase.",
  saveFailed: "Não consegui guardar os seus idiomas para a próxima visita.",
  stumble: "Tivemos um tropeço",
  connection: {
    checking: {
      title: "Acordando o Pío…",
      description: "Isso pode levar alguns segundos.",
    },
    offline: {
      title: "Não consigo me conectar",
      description:
        "Verifique a internet e tente de novo. Os seus idiomas continuam guardados.",
    },
    access: {
      title: "Olá! Preciso do seu código",
      description: "Digite-o para começar a praticar.",
    },
    unconfigured: {
      title: "Ainda não falo esse idioma",
      description:
        "Escolha outro idioma por enquanto, no canto superior direito.",
    },
  },
  session: {
    fallbackLanguage: "o idioma que você está aprendendo",
    permission: {
      title: "Deixe-me ouvir você",
      description: "Permita o microfone no aviso do seu navegador.",
    },
    thinking: { title: "Deixe-me pensar…", description: "Um segundinho." },
    place: (at, total) => `Palavra ${at} de ${total}.`,
    again: "Outra vez, devagarinho",
    parts: "Vamos por partes",
    listenTo: (named) => `Escute: ${named}.`,
    sayOnly: (named) => `Diga só: ${named}.`,
    missed: "Não consegui ouvir você",
    hearing: "Estou ouvindo",
    stopped: "Em pausa",
    waiting: "Continuo aqui",
    tapAndSay: (word) => `Toque no microfone e diga: ${word}.`,
    nowYouWord: "Agora diga você.",
    wholeListen: {
      title: "É isso!",
      description: "Escute a frase completa mais uma vez.",
    },
    wholeSay: {
      title: "Agora completa!",
      description: "Por partes já saiu. Diga tudo junto.",
    },
    almost: "Quase! Escute outra vez",
    missingBit: "Faltou um pedacinho. Depois diga completa.",
    watchMarked: "Repare nas palavras destacadas.",
    slower: "Depois diga um pouco mais devagar.",
    replies: "O Pío responde",
    listenThenAnswer: (language) => `Escute e depois responda em ${language}.`,
    howItSounds: {
      title: "Escute como soa",
      description: "Depois é a sua vez.",
    },
    tuning: { title: "Quase lá…", description: "Estou afinando a voz." },
    closer: "Diga outra vez, um pouquinho mais perto do microfone.",
    repeat: "Repita a frase. Se preferir outra, diga no seu idioma.",
    answerIn: (language) =>
      `Responda em ${language}. Se travar, diga no seu idioma.`,
    calm: "Fale com calma. Quando fizer uma pausa, eu continuo.",
    accepted: {
      title: "Bem dito!",
      description: "Entendi tudo. Vamos para outra.",
    },
    stoppedPhrase: "Toque no microfone para continuar com a sua frase.",
    stoppedFree: "Toque no microfone quando quiser continuar.",
    waitedPhrase: "Fiquei esperando. Toque no microfone e repita a frase.",
    waitedFree: "Fiquei esperando. Toque no microfone quando quiser continuar.",
    onceMore: "Mais uma vez",
    onceMoreMany: "Diga com calma. Se preferir, toque em «Outra frase».",
    onceMoreCalm: "Diga completa, com calma.",
    nowYou: {
      title: "Agora diga você!",
      description: "Repita a frase completa.",
    },
    keepTalking: "Vamos continuar conversando",
    ask: "O que você quer dizer?",
    askHow: "Diga no seu idioma e eu mostro como se diz.",
    streak: (days) => `Já são ${days} dias seguidos.`,
  },
  mic: {
    speak: "Falar",
    done: "Pronto",
    myTurn: "Minha vez",
    cancel: "Cancelar",
    wait: "Um momento…",
  },
  examples: [
    "Quero pedir um café, por favor",
    "Onde fica o banheiro?",
    "Muito prazer, como você se chama?",
    "A conta, por favor",
    "Quanto custa isto?",
    "Não entendo, pode repetir?",
    "Bom dia, como você está?",
  ],
  announce: {
    permission: "Permita o microfone.",
    accepted: (n) =>
      `Bem dito. Já ${n === 1 ? "é" : "são"} ${n} ${n === 1 ? "frase" : "frases"} hoje.`,
    almost: "Quase.",
    practise: (words) => `Pratique: ${words}.`,
    paused: "O Pío está em pausa.",
  },
  loading: "Preparando o Pío…",
  stars: {
    title: "Frases conseguidas hoje",
    done: (n) => (n === 1 ? "frase conseguida" : "frases conseguidas"),
    today: "hoje",
    days: (n) => `${n} dias seguidos`,
    streak: (n) => `Já são ${n} dias seguidos.`,
  },
  changeLanguages: (native, target) =>
    `Mudar idiomas. Agora: ${native} para ${target}`,
  welcome: {
    hello: "Olá, eu sou o",
    intro: "Aprenda um idioma falando, uma frase de cada vez.",
    steps: [
      "Diga algo no seu idioma.",
      "Escute como se diz e repita.",
      "Eu ajudo você a aperfeiçoar, sem pressa.",
    ],
    choose: "Escolha os seus idiomas",
  },
  tryWith: "Experimente:",
  youSaid: "Você disse",
  recap: {
    title: "A sua prática de hoje",
    hardOne: "Deu trabalho: ",
    hardMany: "Deram trabalho: ",
  },
  pending: "Ficou pendente:",
  review: "Rever",
  listenAgain: "Ouvir de novo",
  retry: "Tentar de novo",
  changeLanguage: "Mudar idioma",
  checking: "Verificando…",
  hint: "Toque uma vez. Eu escuto, respondo e volto a escutar.",
  pause: "Pausar",
  another: "Outra frase",
  restart: "Recomeçar",
  help: {
    summary: "Ajuda e privacidade",
    steps: [
      "Diga algo no seu idioma. O Pío traduz e diz para você.",
      "Repita. O Pío ajuda até que se entenda tudo.",
      "Se você falar no idioma que está aprendendo, o Pío responde e vocês conversam.",
      "Para ouvir a frase outra vez, diga «repita» ou toque em Ouvir.",
    ],
    microphone:
      "O microfone liga quando você toca em Falar e volta a ligar sozinho entre os turnos. Pausar, ficar em silêncio ou sair desta aba desliga-o.",
    policy: "Política de privacidade",
    privacy:
      "O Pío verifica com que clareza cada palavra foi entendida; não mede sons exatos. A sua voz é enviada à ElevenLabs para entender você; o texto, e o áudio de uma palavra que não saiu, à OpenAI para traduzir, conversar e dar uma dica. Nada é guardado em uma base de dados. Os seus idiomas e estrelas ficam neste navegador.",
  },
  settings: { title: "Os seus idiomas", close: "Fechar idiomas" },
  access: {
    label: "Código de acesso",
    entering: "Entrando…",
    enter: "Entrar",
    failed: "Esse código não funcionou. Verifique-o ou espere um minuto.",
  },
  card: {
    label: "Frase de prática",
    wellSaid: "Bem dito",
    yourPhrase: (language) => `A sua frase em ${language}`,
    score: (n) => `Clareza: ${n} de 10`,
    leftOut: "Faltou dizer:",
    polish: "Para aperfeiçoar:",
    unclearOne: "Não se entendeu bem:",
    unclearMany: "Não se entenderam bem:",
    listen: "Ouvir",
    slow: "Devagar",
  },
  form: {
    mine: "O meu idioma",
    pickMine: "Selecione o seu idioma",
    practise: "Quero praticar",
    pick: "Selecione um idioma",
    different: "Escolha um idioma diferente do seu para praticar.",
    remember:
      "Vamos lembrar a sua escolha neste navegador. Você pode mudá-la quando quiser.",
    save: "Guardar e continuar",
  },
};

const all: Record<string, Copy> = { es, en, de, fr, it, pt };
export const spanish = es;
// The copy for a learner's language; Spanish when the language is unknown.
export const copyFor = (locale: string | null | undefined): Copy =>
  (locale && all[base(locale)]) || es;

// The first supported language the browser asks for, if any.
export function browserLocale(wanted: readonly string[]): Locale | "" {
  for (const mine of wanted) {
    const exact = locales.find((l) => l === mine);
    if (exact) return exact;
    const close = locales.find((l) => base(l) === base(mine));
    if (close) return close;
  }
  return "";
}

// Languages offered in more than one variety show which one.
const varied = (locale: Locale) =>
  locales.filter((l) => base(l) === base(locale)).length > 1;
const capital = (text: string, ui: string) =>
  text.charAt(0).toLocaleUpperCase(ui) + text.slice(1);
// The name of a language as it is written inside a sentence of `ui`
// ("alemán", "German", "Deutsch").
export function languageIn(locale: Locale, ui: string) {
  try {
    const name =
      new Intl.DisplayNames([ui], { type: "language" }).of(base(locale)) ||
      locale;
    // Browsers disagree on the first letter, so the language decides: English
    // and German write language names with a capital, the others do not.
    const first = name.charAt(0);
    return (
      (["en", "de"].includes(base(ui))
        ? first.toLocaleUpperCase(ui)
        : first.toLocaleLowerCase(ui)) + name.slice(1)
    );
  } catch {
    return locale;
  }
}
// The name of a language for a list or a label, in the language `ui`. With
// `region`, varieties of one language are told apart ("Español · México").
export function languageName(locale: Locale, ui: string, region = false) {
  const name = capital(languageIn(locale, ui), ui);
  if (!region || !varied(locale)) return name;
  try {
    const place = new Intl.DisplayNames([ui], { type: "region" }).of(
      locale.split("-")[1],
    );
    return place ? `${name} · ${place}` : name;
  } catch {
    return name;
  }
}
// A language named in itself, the way its own speakers recognise it.
export const ownName = (locale: Locale) => languageName(locale, locale, true);
