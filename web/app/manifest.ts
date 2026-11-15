import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Pío",
    short_name: "Pío",
    description: "Practica idiomas hablando.",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#0b1516",
    theme_color: "#0b1516",
    icons: [
      { src: "/pio/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/pio/icon-512.png", sizes: "512x512", type: "image/png" },
      {
        src: "/pio/icon-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
