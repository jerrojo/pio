import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Pío · Tu voz, un nuevo idioma",
  description:
    "Practica idiomas hablando. Traduce, repite y conversa a tu ritmo.",
  robots: { index: false, follow: false },
  icons: { icon: "/pio/icon.png", apple: "/pio/apple-icon.png" },
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b1516",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
