import {
  SCRAPER_UA,
  cleanSourceUrl,
  inferType,
  type ScrapedEvent,
} from "./normalize";

const BASE = "https://feverup.com/es/cordoba-argentina";
const SOURCE_NAME = "Fever";

const CATEGORIES = [
  `${BASE}/conciertos-festivales`,
  `${BASE}/teatro-comedia-espectaculos`,
  `${BASE}/eventos-musicales`,
  `${BASE}/actividades-juegos`,
];

const MONTHS: Record<string, number> = {
  ene: 0,
  feb: 1,
  mar: 2,
  abr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  ago: 7,
  sept: 8,
  sep: 8,
  oct: 9,
  nov: 10,
  dic: 11,
};

function parseFeverDate(text: string): string | null {
  // "27 jul" | "23 ago - 10 ene"
  const first = text.toLowerCase().match(/(\d{1,2})\s+([a-záéíóú]+)/);
  if (!first) return null;
  const day = Number(first[1]);
  const rawMonth = first[2]
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  const month =
    MONTHS[rawMonth] ??
    MONTHS[rawMonth.slice(0, 4)] ??
    MONTHS[rawMonth.slice(0, 3)];
  if (month == null) return null;
  const now = new Date();
  let year = now.getFullYear();
  const candidate = new Date(year, month, day, 20, 0);
  if (candidate.getTime() < now.getTime() - 14 * 24 * 60 * 60 * 1000) {
    year += 1;
  }
  const d = new Date(year, month, day, 20, 0);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

function parseArsPrice(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ");
  const m = normalized.match(/([\d.]+),\d{2}\s*ARS|([\d.]+)\s*ARS/i);
  if (!m) return null;
  const raw = (m[1] || m[2] || "").replace(/\./g, "");
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function splitTitleVenue(title: string): { title: string; address: string } {
  const parts = title.split(" - ");
  if (parts.length >= 2) {
    const venue = parts[parts.length - 1]!.trim();
    if (
      venue.length > 2 &&
      venue.length < 80 &&
      !/^ver detalles$/i.test(venue)
    ) {
      return {
        title: parts.slice(0, -1).join(" - ").trim(),
        address: `${venue}, Córdoba`,
      };
    }
  }
  return { title, address: "Córdoba" };
}

type FeverCard = {
  title: string;
  url: string;
  dateText: string;
  priceText: string;
};

function extractCards(html: string): FeverCard[] {
  const byUrl = new Map<string, FeverCard>();
  const re =
    /title="([^"]+)"[^>]*href="(https:\/\/feverup\.com\/m\/\d+)"([\s\S]{0,3500}?)(?=title="[^"]+"[^>]*href="https:\/\/feverup\.com\/m\/\d+"|$)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const chunk = m[3] ?? "";
    const dateText =
      chunk.match(/fv-plan-card-v2__date-range[^>]*>([^<]+)/i)?.[1]?.trim() ??
      "";
    const priceText =
      chunk
        .match(
          /(?:data-testid="fv-plan-card-v2__price"|fv-plan-card-v2__price)[^>]*>([\s\S]*?)(?:<\/div>|<\/span>)/i,
        )?.[1]
        ?.replace(/<[^>]+>/g, " ")
        .trim() ?? "";
    const card: FeverCard = {
      title: m[1]!.trim(),
      url: m[2]!,
      dateText,
      priceText,
    };
    const prev = byUrl.get(card.url);
    if (
      !prev ||
      (card.dateText && !prev.dateText) ||
      (card.priceText && !prev.priceText)
    ) {
      byUrl.set(card.url, {
        ...card,
        dateText: card.dateText || prev?.dateText || "",
        priceText: card.priceText || prev?.priceText || "",
        title: card.title || prev?.title || "",
      });
    }
  }
  return [...byUrl.values()];
}

async function scrapeCategory(url: string): Promise<ScrapedEvent[]> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": SCRAPER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Fever fetch failed (${url}): ${res.status}`);
  const html = await res.text();
  const events: ScrapedEvent[] = [];

  for (const card of extractCards(html)) {
    if (/tarjeta regalo/i.test(card.title)) continue;

    const starts_at =
      parseFeverDate(card.dateText) ??
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const price = parseArsPrice(card.priceText);
    const { title, address } = splitTitleVenue(
      card.title.replace(/\s+-\s+Ver detalles$/i, ""),
    );

    events.push({
      title: title.slice(0, 180),
      description: null,
      event_type: inferType(`${title} ${address}`),
      starts_at,
      ends_at: null,
      address,
      cost_type: "pago",
      price,
      source_url: cleanSourceUrl(card.url),
      source_name: SOURCE_NAME,
      cover_url: null,
    });
  }

  return events;
}

export async function scrapeFever(): Promise<ScrapedEvent[]> {
  const batches = await Promise.allSettled(CATEGORIES.map((url) => scrapeCategory(url)));
  const events: ScrapedEvent[] = [];
  let anyOk = false;
  const errors: string[] = [];

  for (const batch of batches) {
    if (batch.status === "fulfilled") {
      anyOk = true;
      events.push(...batch.value);
    } else {
      errors.push(batch.reason instanceof Error ? batch.reason.message : "error");
    }
  }

  if (!anyOk) {
    throw new Error(errors[0] || "Fever: todas las categorías fallaron");
  }

  const seen = new Set<string>();
  return events
    .filter((e) => {
      if (seen.has(e.source_url)) return false;
      seen.add(e.source_url);
      return true;
    })
    .slice(0, 40);
}
