export type ScrapedEvent = {
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  ends_at: string | null;
  address: string | null;
  /** When the source provides coordinates, prefer these over venue heuristics. */
  lat?: number | null;
  lng?: number | null;
  cost_type: "gratis" | "a_la_gorra" | "pago";
  price: number | null;
  source_url: string;
  source_name: string;
  cover_url: string | null;
};

export const SCRAPER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

export function cleanSourceUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    // Drop tracking params; keep stable identity for upserts.
    for (const key of [...u.searchParams.keys()]) {
      if (/^(aff|utm_|ref|fbclid|gclid)/i.test(key)) u.searchParams.delete(key);
    }
    return u.toString().replace(/\?$/, "");
  } catch {
    return url;
  }
}

export function parseJsonLdBlocks(html: string): unknown[] {
  const blocks: unknown[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    try {
      blocks.push(JSON.parse(m[1].trim()));
    } catch {
      // ignore malformed blocks
    }
  }
  return blocks;
}

export function isOfflineEvent(attendanceMode: string | undefined): boolean {
  if (!attendanceMode) return true;
  return !/OnlineEventAttendanceMode/i.test(attendanceMode);
}

export function formatPlaceAddress(location: unknown): string | null {
  if (!location || typeof location !== "object") return null;
  const loc = location as {
    name?: string;
    address?: string | {
      streetAddress?: string;
      addressLocality?: string;
      addressRegion?: string;
      addressCountry?: string;
    };
  };
  const parts: string[] = [];
  if (loc.name) parts.push(loc.name);
  if (typeof loc.address === "string") {
    parts.push(loc.address);
  } else if (loc.address && typeof loc.address === "object") {
    const a = loc.address;
    if (a.streetAddress) parts.push(a.streetAddress);
    if (a.addressLocality) parts.push(a.addressLocality);
    else if (a.addressRegion) parts.push(a.addressRegion);
  }
  const joined = parts.join(", ").replace(/\s+/g, " ").trim();
  return joined || null;
}

export function geoFromLocation(location: unknown): { lat: number; lng: number } | null {
  if (!location || typeof location !== "object") return null;
  const geo = (location as { geo?: { latitude?: string | number; longitude?: string | number } }).geo;
  if (!geo) return null;
  const lat = Number(geo.latitude);
  const lng = Number(geo.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

/** Keep events roughly around Córdoba Capital (AR). */
export function nearCordobaAR(lat: number | null | undefined, lng: number | null | undefined): boolean {
  if (lat == null || lng == null) return true;
  return lat > -32.2 && lat < -30.7 && lng > -65.0 && lng < -63.5;
}

export function absoluteMediaUrl(src: string | undefined, base: string): string | null {
  if (!src || src.startsWith("data:")) return null;
  try {
    return new URL(src, base).toString();
  } catch {
    return null;
  }
}

export function inferCost(text: string): {
  cost_type: ScrapedEvent["cost_type"];
  price: number | null;
} {
  const lower = text.toLowerCase();
  if (lower.includes("gorra")) return { cost_type: "a_la_gorra", price: null };
  if (
    lower.includes("gratuita") ||
    lower.includes("gratuito") ||
    lower.includes("entrada libre") ||
    lower.includes("entrada gratis") ||
    lower.includes("libre y gratuita")
  ) {
    return { cost_type: "gratis", price: null };
  }
  const priceMatch = text.match(/\$\s*([\d.]+)/);
  if (priceMatch) {
    const price = Number(priceMatch[1].replace(/\./g, ""));
    return { cost_type: "pago", price: Number.isFinite(price) ? price : null };
  }
  if (lower.includes("bono") || lower.includes("entrada") || lower.includes("costo")) {
    return { cost_type: "pago", price: null };
  }
  return { cost_type: "gratis", price: null };
}

export function inferType(text: string): string {
  const lower = text.toLowerCase();
  if (/música|musica|concierto|bandone|jazz|cuarteto|folklore/.test(lower)) return "musica";
  if (/teatro|títere|titere|obra|circo/.test(lower)) return "teatro";
  if (/cine|película|pelicula/.test(lower)) return "cine";
  if (/feria/.test(lower)) return "feria";
  if (/muestra|exposición|exposicion|museo|galería|galeria/.test(lower)) return "exposicion";
  if (/infancia|infantil|niñ|familia/.test(lower)) return "infantil";
  if (/fiesta|boliche|dj/.test(lower)) return "fiesta";
  if (/deporte|\bpartidos?\b|carrera/.test(lower)) return "deporte";
  if (/gastro|asado|comida|sabores/.test(lower)) return "gastronomico";
  return "otro";
}

export async function geocodeAddress(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const q = encodeURIComponent(`${address}, Córdoba, Argentina`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${q}`,
      {
        headers: {
          "User-Agent": "CanutoApp/1.0 (event discovery; contact@canuto.local)",
        },
        next: { revalidate: 86400 },
      },
    );
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (!data[0]) return null;
    return { lat: Number(data[0].lat), lng: Number(data[0].lon) };
  } catch {
    return null;
  }
}

/** Rough Córdoba venue fallbacks */
export const VENUE_COORDS: Record<string, { lat: number; lng: number }> = {
  "teatro comedia": { lat: -31.4167, lng: -64.1833 },
  "parque las heras": { lat: -31.4295, lng: -64.1882 },
  "museo juan de tejeda": { lat: -31.4189, lng: -64.1865 },
  "centro cultural córdoba": { lat: -31.4286, lng: -64.184 },
  cabildo: { lat: -31.4168, lng: -64.1836 },
  "teatro del libertador": { lat: -31.4195, lng: -64.1885 },
};

export function guessCoords(address: string | null): { lat: number; lng: number } {
  if (address) {
    const lower = address.toLowerCase();
    for (const [key, coords] of Object.entries(VENUE_COORDS)) {
      if (lower.includes(key)) return coords;
    }
  }
  // Córdoba Capital default with slight jitter
  return {
    lat: -31.4201 + (Math.random() - 0.5) * 0.02,
    lng: -64.1888 + (Math.random() - 0.5) * 0.02,
  };
}
