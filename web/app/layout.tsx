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
  title: "pío · Learn a language by speaking",
  description:
    "Practice languages by speaking. Translate, repeat and chat at your own pace.",
  metadataBase: new URL("https://pio.today"),
  // What a shared link shows in a chat.
  openGraph: {
    title: "pío · Learn a language by speaking",
    description: "Practice languages by speaking, one phrase at a time.",
    url: "/",
    siteName: "pío",
    locale: "en_US",
    type: "website",
    images: [{ url: "/pio/share.jpg", width: 1200, height: 630, alt: "pío" }],
  },
  twitter: { card: "summary_large_image", images: ["/pio/share.jpg"] },
  robots: { index: false, follow: false },
  icons: { icon: "/pio/icon.png", apple: "/pio/apple-icon.png" },
  // Opens full screen, like an app, when added to the home screen.
  appleWebApp: {
    capable: true,
    title: "pío",
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
    <html lang="en" className={`${display.variable} ${text.variable}`}>
      <body>{children}</body>
    </html>
  );
}
