import type { EventTypeId } from "@/lib/constants";
import { eventTypeLabel } from "@/lib/constants";

export type MediaKind = "image" | "video" | "youtube" | "vimeo";

const VIDEO_EXT = /\.(mp4|webm|ogg|mov)(\?|#|$)/i;
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?|#|$)/i;

export function detectMediaKind(url: string): MediaKind {
  const u = url.trim();
  if (/youtube\.com\/watch|youtu\.be\/|youtube\.com\/embed\//i.test(u)) return "youtube";
  if (/vimeo\.com\//i.test(u)) return "vimeo";
  if (VIDEO_EXT.test(u)) return "video";
  if (IMAGE_EXT.test(u)) return "image";
  // CDN / scrape URLs without extension — treat as image
  return "image";
}

export function youtubeEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    const id = u.searchParams.get("v") || u.pathname.split("/embed/")[1];
    return id ? `https://www.youtube.com/embed/${id}` : null;
  } catch {
    return null;
  }
}

export function vimeoEmbedUrl(url: string): string | null {
  try {
    const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
    return m ? `https://player.vimeo.com/video/${m[1]}` : null;
  } catch {
    return null;
  }
}

/** Palettes for generic covers — Córdoba-ish, not purple-AI defaults */
export const TYPE_COVER: Record<
  EventTypeId,
  { from: string; to: string; accent: string }
> = {
  musica: { from: "#1a2838", to: "#e24a30", accent: "#ffe5df" },
  teatro: { from: "#2c1810", to: "#c45c26", accent: "#f5d6c4" },
  cine: { from: "#0f1419", to: "#3a4654", accent: "#d7e0e9" },
  fiesta: { from: "#1a2838", to: "#8b2e6b", accent: "#f5d0e8" },
  deporte: { from: "#0d3b2e", to: "#1f7a5c", accent: "#c8f0e0" },
  gastronomico: { from: "#3b2414", to: "#b85c28", accent: "#f3d9c4" },
  feria: { from: "#1e3a5f", to: "#3d7ea6", accent: "#d6ebf5" },
  exposicion: { from: "#2a2438", to: "#5c6b7a", accent: "#e8e4f0" },
  infantil: { from: "#1f4d3a", to: "#e24a30", accent: "#ffe5df" },
  otro: { from: "#1a2838", to: "#5c6b7a", accent: "#d7e0e9" },
};

export function coverLabel(type: EventTypeId) {
  return eventTypeLabel(type);
}
