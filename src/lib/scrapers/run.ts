import { scrapeMunicipal } from "./municipal";
import { scrapeProvincia } from "./provincia";
import { scrapeEventbrite } from "./eventbrite";
import { scrapeMeetup } from "./meetup";
import { scrapeFever } from "./fever";
import { guessCoords, type ScrapedEvent } from "./normalize";
import { localStore } from "@/lib/events/local-store";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/admin";
import type { CanutoEvent } from "@/lib/types";
import type { CostTypeId, EventTypeId } from "@/lib/constants";

function toEventRow(s: ScrapedEvent) {
  const coords =
    s.lat != null &&
    s.lng != null &&
    Number.isFinite(s.lat) &&
    Number.isFinite(s.lng)
      ? { lat: s.lat, lng: s.lng }
      : guessCoords(s.address);
  return {
    title: s.title,
    description: s.description,
    event_type: s.event_type as EventTypeId,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    lat: coords.lat,
    lng: coords.lng,
    address: s.address,
    cost_type: s.cost_type as CostTypeId,
    price: s.price,
    visibility: "public" as const,
    status: "approved" as const,
    source: "scrape" as const,
    source_url: s.source_url,
    source_name: s.source_name,
    cover_url: s.cover_url,
  };
}

const SCRAPERS: Array<{
  source: string;
  run: () => Promise<ScrapedEvent[]>;
}> = [
  { source: "cultura.cordoba.gob.ar", run: scrapeMunicipal },
  { source: "cultura.cba.gov.ar", run: scrapeProvincia },
  { source: "eventbrite.com.ar", run: scrapeEventbrite },
  { source: "meetup.com", run: scrapeMeetup },
  { source: "feverup.com", run: scrapeFever },
];

export async function runScrapers() {
  const results: Array<{
    source: string;
    ok: boolean;
    message?: string;
    fetched: number;
    upserted: number;
  }> = [];

  const collected: ScrapedEvent[] = [];

  for (const scraper of SCRAPERS) {
    try {
      const events = await scraper.run();
      collected.push(...events);
      results.push({
        source: scraper.source,
        ok: true,
        fetched: events.length,
        upserted: 0,
      });
    } catch (e) {
      results.push({
        source: scraper.source,
        ok: false,
        message: e instanceof Error ? e.message : "error",
        fetched: 0,
        upserted: 0,
      });
    }
  }

  const all = collected.map(toEventRow);

  if (isSupabaseConfigured() && hasServiceRole()) {
    const supabase = createServiceClient();
    let upserted = 0;
    for (const row of all) {
      const { error } = await supabase.from("events").upsert(row, {
        onConflict: "source_url",
      });
      if (!error) upserted += 1;
    }
    const okCount = results.filter((x) => x.ok).length || 1;
    for (const r of results) {
      if (r.ok) r.upserted = Math.round(upserted / okCount);
      await supabase.from("scrape_runs").insert({
        source: r.source,
        ok: r.ok,
        message: r.message ?? null,
        fetched_count: r.fetched,
        upserted_count: r.upserted,
      });
    }
  } else {
    const upserted = localStore.upsertScraped(
      all.map((row) => ({
        ...row,
        created_by: null,
      })) as Omit<CanutoEvent, "id" | "created_at" | "updated_at" | "created_by">[],
    );
    for (const r of results) {
      if (r.ok) r.upserted = Math.min(r.fetched, upserted);
    }
  }

  return { results, total: all.length };
}
