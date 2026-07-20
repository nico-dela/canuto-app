import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Canuto — Eventos Córdoba",
    short_name: "Canuto",
    description: "Descubrí eventos cerca tuyo en Córdoba Capital",
    start_url: "/",
    display: "standalone",
    background_color: "#f2f5f8",
    theme_color: "#f2f5f8",
    lang: "es-AR",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
