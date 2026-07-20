import * as cheerio from "cheerio";
import { absoluteMediaUrl, inferCost, inferType, type ScrapedEvent } from "./normalize";

const SOURCE = "https://cultura.cordoba.gob.ar/agenda/";
const SOURCE_NAME = "Cultura Municipal";

function parseLooseDate(text: string): string | null {
  // Try "11 de julio", "24, 25 y 26 de julio", ISO-ish
  const months: Record<string, number> = {
    enero: 0,
    febrero: 1,
    marzo: 2,
    abril: 3,
    mayo: 4,
    junio: 5,
    julio: 6,
    agosto: 7,
    septiembre: 8,
    octubre: 9,
    noviembre: 10,
    diciembre: 11,
  };
  const year = new Date().getFullYear();
  const m = text.toLowerCase().match(/(\d{1,2})\s*(?:de\s+)?([a-záéíóú]+)/);
  if (m && months[m[2]] != null) {
    const day = Number(m[1]);
    const month = months[m[2]];
    const time = text.match(/(\d{1,2}):(\d{2})/);
    const d = new Date(year, month, day, time ? Number(time[1]) : 20, time ? Number(time[2]) : 0);
    if (!Number.isNaN(d.getTime())) return d.toISOString();
  }
  return null;
}

export async function scrapeMunicipal(): Promise<ScrapedEvent[]> {
  const res = await fetch(SOURCE, {
    headers: { "User-Agent": "CanutoBot/1.0 (+https://canuto.app)" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Municipal fetch failed: ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $("article, .event, .card, .post, section").each((_, el) => {
    const block = $(el);
    const title =
      block.find("h2, h3, .entry-title").first().text().trim() ||
      block.find("a").first().text().trim();
    if (!title || title.length < 5) return;
    if (/noticias|convocatorias|trámites|tramites|menu/i.test(title)) return;

    const text = block.text().replace(/\s+/g, " ").trim();
    if (text.length < 40) return;

    const link =
      block.find("a[href]").first().attr("href") ||
      `${SOURCE}#${encodeURIComponent(title.slice(0, 40))}`;
    const absolute = link.startsWith("http") ? link : new URL(link, SOURCE).toString();

    const addressMatch = text.match(
      /(teatro [^.]+|parque [^.]+|museo [^.]+|centro cultural [^.]+|rivadavia \d+|blvd[^.]+)/i,
    );
    const address = addressMatch?.[0]?.trim() ?? "Córdoba Capital";
    const { cost_type, price } = inferCost(text);
    const starts_at = parseLooseDate(text) ?? new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const img =
      block.find("img[src], img[data-src], img[data-lazy-src]").first().attr("src") ||
      block.find("img").first().attr("data-src") ||
      block.find("img").first().attr("data-lazy-src") ||
      block.find("source[srcset]").first().attr("srcset")?.split(/\s+/)[0];
    const cover_url = absoluteMediaUrl(img, SOURCE);

    events.push({
      title: title.slice(0, 180),
      description: text.slice(0, 500),
      event_type: inferType(`${title} ${text}`),
      starts_at,
      ends_at: null,
      address,
      cost_type,
      price,
      source_url: absolute,
      source_name: SOURCE_NAME,
      cover_url,
    });
  });

  // Deduplicate by title
  const seen = new Set<string>();
  return events.filter((e) => {
    const key = e.title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).slice(0, 40);
}
