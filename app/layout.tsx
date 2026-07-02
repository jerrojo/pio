import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'Pío — Aprende idiomas hablando',
  description:
    'Conversa con una IA que te escucha, traduce y evalúa tu pronunciación en tiempo real. Italiano, inglés, francés, alemán, portugués y español.',
  metadataBase: new URL('https://www.pio.today'),
  openGraph: {
    title: 'Pío — Aprende idiomas hablando',
    description: 'Tu profe de idiomas con IA: habla, escucha y domina la pronunciación.',
    url: 'https://www.pio.today',
    siteName: 'Pío',
    locale: 'es_MX',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0b1120',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
