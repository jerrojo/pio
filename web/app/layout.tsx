import type { Metadata, Viewport } from "next";
import { Baloo_2, Nunito } from "next/font/google";
import "./globals.css";
// Self-hosted and preloaded with the page: no request to another site, and
// no blank text while a stylesheet chain resolves.
const display = Baloo_2({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-display",
  display: "swap",
});
const text = Nunito({
  subsets: ["latin"],
  weight: ["400", "600", "700", "800"],
  variable: "--font-text",
  display: "swap",
});
export const metadata: Metadata = {
  title: "Pío · Tu voz, un nuevo idioma",
  description:
    "Practica idiomas hablando. Traduce, repite y conversa a tu ritmo.",
  robots: { index: false, follow: false },
  icons: { icon: "/pio/icon.png", apple: "/pio/apple-icon.png" },
  // Opens full screen, like an app, when added to the home screen.
  appleWebApp: {
    capable: true,
    title: "Pío",
    statusBarStyle: "black-translucent",
  },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1516",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
