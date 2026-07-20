import * as cheerio from "cheerio";
import { absoluteMediaUrl, inferCost, inferType, type ScrapedEvent } from "./normalize";

const SOURCE = "https://cultura.cba.gov.ar/eventos/";
const SOURCE_NAME = "Agencia Córdoba Cultura";

export async function scrapeProvincia(): Promise<ScrapedEvent[]> {
  const res = await fetch(SOURCE, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
      Referer: "https://cultura.cba.gov.ar/",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) {
    // CloudFront often blocks datacenter IPs; fail soft so municipal still runs.
    throw new Error(`Provincia fetch failed: ${res.status}`);
  }
  const html = await res.text();
  const $ = cheerio.load(html);
  const events: ScrapedEvent[] = [];

  $("article, .tribe-events-calendar-list__event, .event, .card, li").each((_, el) => {
    const block = $(el);
    const title = block.find("h2, h3, .tribe-event-url, a").first().text().trim();
    if (!title || title.length < 5) return;
    if (/suscribir|calendario|encontrados/i.test(title)) return;

    const text = block.text().replace(/\s+/g, " ").trim();
    const href = block.find("a[href]").first().attr("href");
    if (!href) return;
    const absolute = href.startsWith("http") ? href : new URL(href, SOURCE).toString();
    if (!absolute.includes("cultura.cba.gov.ar")) return;

    const { cost_type, price } = inferCost(text);
    const datetime =
      block.find("time").attr("datetime") ||
      block.find("[datetime]").attr("datetime") ||
      null;

    const img =
      block.find("img[src], img[data-src]").first().attr("src") ||
      block.find("img").first().attr("data-src") ||
      block.find("img").first().attr("data-lazy-src");
    const cover_url = absoluteMediaUrl(img, SOURCE);

    events.push({
      title: title.slice(0, 180),
      description: text.slice(0, 500),
      event_type: inferType(`${title} ${text}`),
      starts_at: datetime ? new Date(datetime).toISOString() : new Date(Date.now() + 36 * 60 * 60 * 1000).toISOString(),
      ends_at: null,
      address: "Córdoba",
      cost_type,
      price,
      source_url: absolute,
      source_name: SOURCE_NAME,
      cover_url,
    });
  });

  const seen = new Set<string>();
  return events
    .filter((e) => {
      const key = e.source_url;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 40);
}
