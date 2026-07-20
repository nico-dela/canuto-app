import { scrapeMunicipal } from "./municipal";
import { scrapeProvincia } from "./provincia";
import { guessCoords, type ScrapedEvent } from "./normalize";
import { localStore } from "@/lib/events/local-store";
import { hasServiceRole, isSupabaseConfigured } from "@/lib/supabase/config";
import { createServiceClient } from "@/lib/supabase/admin";
import type { CanutoEvent } from "@/lib/types";
import type { CostTypeId, EventTypeId } from "@/lib/constants";

function toEventRow(s: ScrapedEvent) {
  const coords = guessCoords(s.address);
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

export async function runScrapers() {
  const results: Array<{
    source: string;
    ok: boolean;
    message?: string;
    fetched: number;
    upserted: number;
  }> = [];

  let municipal: ScrapedEvent[] = [];
  let provincia: ScrapedEvent[] = [];

  try {
    municipal = await scrapeMunicipal();
    results.push({
      source: "cultura.cordoba.gob.ar",
      ok: true,
      fetched: municipal.length,
      upserted: 0,
    });
  } catch (e) {
    results.push({
      source: "cultura.cordoba.gob.ar",
      ok: false,
      message: e instanceof Error ? e.message : "error",
      fetched: 0,
      upserted: 0,
    });
  }

  try {
    provincia = await scrapeProvincia();
    results.push({
      source: "cultura.cba.gov.ar",
      ok: true,
      fetched: provincia.length,
      upserted: 0,
    });
  } catch (e) {
    results.push({
      source: "cultura.cba.gov.ar",
      ok: false,
      message: e instanceof Error ? e.message : "error",
      fetched: 0,
      upserted: 0,
    });
  }

  const all = [...municipal, ...provincia].map(toEventRow);

  if (isSupabaseConfigured() && hasServiceRole()) {
    const supabase = createServiceClient();
    let upserted = 0;
    for (const row of all) {
      const { error } = await supabase.from("events").upsert(row, {
        onConflict: "source_url",
      });
      if (!error) upserted += 1;
    }
    for (const r of results) {
      if (r.ok) r.upserted = Math.round(upserted / results.filter((x) => x.ok).length);
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
