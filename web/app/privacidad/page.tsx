import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = {
  title: "Pío · Privacidad",
  description: "Qué hace Pío con tu voz y tus datos.",
  robots: { index: true, follow: true },
};
// The privacy policy, in plain words, in Spanish and in English. It describes
// what the code really does; change it whenever that changes.
export default function Privacy() {
  return (
    <div className="app-shell">
      <main className="policy">
        <p>
          <Link href="/">← Pío</Link>
        </p>
        <h1>Privacidad</h1>
        <p className="policy-date">Vigente desde el 25 de noviembre de 2026.</p>
        <p>
          Pío es una app para practicar idiomas hablando. No pide cuenta, no
          muestra anuncios y no te rastrea.
        </p>
        <h2>Tu voz</h2>
        <p>
          El micrófono solo se enciende cuando tocas Hablar y se apaga al
          pausar, al quedarte en silencio o al salir de la app. Cada cosa que
          dices se envía a nuestro servidor para entenderla y contestarte:
        </p>
        <ul>
          <li>
            El audio va a ElevenLabs, que lo convierte en texto y revisa qué tan
            claro se entendió cada palabra. ElevenLabs también genera la voz de
            Pío.
          </li>
          <li>
            El texto, y el audio de una palabra suelta que no salió, van a
            OpenAI para traducir, conversar y darte un consejo de pronunciación.
          </li>
        </ul>
        <p>
          Pío no guarda tus grabaciones ni las asocia a tu identidad. Esos
          proveedores las procesan en nuestro nombre y bajo sus propias
          políticas.
        </p>
        <h2>Lo que queda registrado</h2>
        <p>
          Para encontrar y corregir fallas, el servidor anota por poco tiempo
          datos técnicos de cada turno: cuánto tardó, el texto que se entendió y
          qué tan clara salió cada palabra. No anota tu nombre, tu correo ni tu
          ubicación, y no hay base de datos de usuarios.
        </p>
        <h2>Lo que se queda en tu dispositivo</h2>
        <p>
          Tus idiomas, tus estrellas y las frases pendientes se guardan solo en
          tu dispositivo. Se borran al borrar los datos de la app o del
          navegador.
        </p>
        <h2>Lo que no hacemos</h2>
        <p>
          No vendemos datos, no usamos publicidad ni herramientas de
          seguimiento, y no usamos tu voz para identificarte. Pío no está
          dirigido a menores de 13 años.
        </p>
        <h2>Cambios</h2>
        <p>
          Si cambia lo que Pío hace con tus datos, esta página cambia primero y
          se actualiza la fecha de arriba.
        </p>

        <h1 lang="en">Privacy</h1>
        <div lang="en">
          <p className="policy-date">Effective 25 November 2026.</p>
          <p>
            Pío is an app for practising languages by speaking. It asks for no
            account, shows no ads and does not track you.
          </p>
          <h2>Your voice</h2>
          <p>
            The microphone only turns on when you tap Speak, and turns off when
            you pause, stay silent or leave the app. Everything you say is sent
            to our server to understand it and answer you:
          </p>
          <ul>
            <li>
              The audio goes to ElevenLabs, which turns it into text and checks
              how clearly each word came through. ElevenLabs also generates
              Pío&apos;s voice.
            </li>
            <li>
              The text, and the audio of a single word that did not come out, go
              to OpenAI to translate, chat and give you a pronunciation tip.
            </li>
          </ul>
          <p>
            Pío does not keep your recordings or link them to your identity.
            Those providers process them on our behalf and under their own
            policies.
          </p>
          <h2>What is logged</h2>
          <p>
            To find and fix problems, the server briefly logs technical data
            about each turn: how long it took, the text that was understood and
            how clearly each word came through. It does not log your name, email
            or location, and there is no user database.
          </p>
          <h2>What stays on your device</h2>
          <p>
            Your languages, your stars and your pending phrases are stored only
            on your device. They are erased when you erase the app&apos;s or the
            browser&apos;s data.
          </p>
          <h2>What we do not do</h2>
          <p>
            We do not sell data, use advertising or tracking tools, or use your
            voice to identify you. Pío is not directed at children under 13.
          </p>
          <h2>Changes</h2>
          <p>
            If what Pío does with your data changes, this page changes first and
            the date above is updated.
          </p>
        </div>
      </main>
    </div>
  );
}
