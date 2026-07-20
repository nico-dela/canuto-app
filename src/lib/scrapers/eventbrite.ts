import {
  SCRAPER_UA,
  cleanSourceUrl,
  formatPlaceAddress,
  geoFromLocation,
  inferCost,
  inferType,
  isOfflineEvent,
  nearCordobaAR,
  parseJsonLdBlocks,
  type ScrapedEvent,
} from "./normalize";

const SOURCE =
  "https://www.eventbrite.com.ar/d/argentina--c%C3%B3rdoba/events/";
const SOURCE_NAME = "Eventbrite";

type LdEvent = {
  "@type"?: string;
  name?: string;
  description?: string;
  url?: string;
  image?: string | string[];
  startDate?: string;
  endDate?: string;
  eventAttendanceMode?: string;
  location?: unknown;
  offers?: { price?: string | number; lowPrice?: string | number } | Array<{
    price?: string | number;
    lowPrice?: string | number;
  }>;
};

function listEvents(blocks: unknown[]): LdEvent[] {
  const out: LdEvent[] = [];
  for (const block of blocks) {
    if (!block || typeof block !== "object") continue;
    const b = block as { "@type"?: string; itemListElement?: unknown[]; jsonld?: unknown[] };
    const lists = b.itemListElement
      ? [b]
      : Array.isArray((block as { jsonld?: unknown[] }).jsonld)
        ? ((block as { jsonld: unknown[] }).jsonld as object[])
        : [block];
    for (const list of lists) {
      if (!list || typeof list !== "object") continue;
      const elements = (list as { itemListElement?: unknown[] }).itemListElement;
      if (!Array.isArray(elements)) continue;
      for (const el of elements) {
        if (!el || typeof el !== "object") continue;
        const item = (el as { item?: LdEvent }).item ?? (el as LdEvent);
        if (item?.["@type"] === "Event" || item?.name) out.push(item);
      }
    }
  }
  return out;
}

function offerPrice(offers: LdEvent["offers"]): number | null {
  const first = Array.isArray(offers) ? offers[0] : offers;
  if (!first) return null;
  const raw = first.lowPrice ?? first.price;
  if (raw == null || raw === "") return null;
  const n = Number(String(raw).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function coverOf(image: LdEvent["image"]): string | null {
  if (!image) return null;
  return Array.isArray(image) ? image[0] ?? null : image;
}

export async function scrapeEventbrite(): Promise<ScrapedEvent[]> {
  const res = await fetch(SOURCE, {
    headers: {
      "User-Agent": SCRAPER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Eventbrite fetch failed: ${res.status}`);
  const html = await res.text();

  let events = listEvents(parseJsonLdBlocks(html));

  // Fallback: jsonld embedded in window.__SERVER_DATA__
  if (events.length === 0) {
    const m = html.match(/window\.__SERVER_DATA__\s*=\s*(\{[\s\S]*?\});\s*</);
    if (m) {
      try {
        const data = JSON.parse(m[1]) as { jsonld?: unknown[] };
        if (Array.isArray(data.jsonld)) events = listEvents(data.jsonld);
      } catch {
        // ignore
      }
    }
  }

  const out: ScrapedEvent[] = [];
  for (const item of events) {
    const title = item.name?.trim();
    const url = item.url?.trim();
    if (!title || !url || !item.startDate) continue;
    if (!isOfflineEvent(item.eventAttendanceMode)) continue;

    const geo = geoFromLocation(item.location);
    if (geo && !nearCordobaAR(geo.lat, geo.lng)) continue;

    const address = formatPlaceAddress(item.location) ?? "Córdoba";
    const description = item.description?.trim() || null;
    const blob = `${title} ${description ?? ""} ${address}`;
    const price = offerPrice(item.offers);
    const inferred = inferCost(blob);
    const cost_type = price != null && price > 0 ? "pago" : inferred.cost_type;
    const starts = new Date(item.startDate);
    if (Number.isNaN(starts.getTime())) continue;
    const ends = item.endDate ? new Date(item.endDate) : null;

    out.push({
      title: title.slice(0, 180),
      description: description?.slice(0, 500) ?? null,
      event_type: inferType(blob),
      starts_at: starts.toISOString(),
      ends_at: ends && !Number.isNaN(ends.getTime()) ? ends.toISOString() : null,
      address,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      cost_type,
      price: price ?? inferred.price,
      source_url: cleanSourceUrl(url),
      source_name: SOURCE_NAME,
      cover_url: coverOf(item.image),
    });
  }

  const seen = new Set<string>();
  return out
    .filter((e) => {
      if (seen.has(e.source_url)) return false;
      seen.add(e.source_url);
      return true;
    })
    .slice(0, 40);
}
