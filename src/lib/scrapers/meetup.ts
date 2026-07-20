import {
  SCRAPER_UA,
  cleanSourceUrl,
  inferCost,
  inferType,
  type ScrapedEvent,
} from "./normalize";

const SOURCE =
  "https://www.meetup.com/find/?location=ar--cordoba&source=EVENTS&eventType=inPerson";
const SOURCE_NAME = "Meetup";

type ApolloEntity = Record<string, unknown>;

type MeetupEvent = {
  __typename?: string;
  id?: string;
  title?: string;
  dateTime?: string;
  description?: string;
  eventType?: string;
  eventUrl?: string;
  feeSettings?: { amount?: string | number; currency?: string } | null;
  venue?: {
    name?: string;
    address?: string;
    city?: string;
    lat?: number;
    lng?: number;
    lon?: number;
  } | null;
  featuredEventPhoto?: { __ref?: string } | null;
  displayPhoto?: { __ref?: string } | null;
};

function extractApollo(html: string): Record<string, ApolloEntity> | null {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    const data = JSON.parse(m[1]) as {
      props?: { pageProps?: { __APOLLO_STATE__?: Record<string, ApolloEntity> } };
    };
    return data.props?.pageProps?.__APOLLO_STATE__ ?? null;
  } catch {
    return null;
  }
}

function resolvePhoto(
  apollo: Record<string, ApolloEntity>,
  ref: { __ref?: string } | null | undefined,
): string | null {
  if (!ref?.__ref) return null;
  const photo = apollo[ref.__ref] as
    | { highResUrl?: string; baseUrl?: string; id?: string }
    | undefined;
  if (!photo) return null;
  if (photo.highResUrl) return photo.highResUrl;
  if (photo.baseUrl && photo.id) return `${photo.baseUrl}${photo.id}.jpeg`;
  return null;
}

function venueAddress(venue: MeetupEvent["venue"]): string | null {
  if (!venue) return "Córdoba";
  const parts = [venue.name, venue.address, venue.city || "Córdoba"].filter(Boolean);
  return parts.join(", ");
}

export async function scrapeMeetup(): Promise<ScrapedEvent[]> {
  const res = await fetch(SOURCE, {
    headers: {
      "User-Agent": SCRAPER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "es-AR,es;q=0.9,en;q=0.8",
    },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`Meetup fetch failed: ${res.status}`);
  const html = await res.text();
  const apollo = extractApollo(html);
  if (!apollo) throw new Error("Meetup: no Apollo state in page");

  const out: ScrapedEvent[] = [];
  for (const [key, value] of Object.entries(apollo)) {
    if (!key.startsWith("Event:") || value.__typename !== "Event") continue;
    const ev = value as MeetupEvent;
    if (ev.eventType && ev.eventType !== "PHYSICAL") continue;
    const title = ev.title?.trim();
    const url = ev.eventUrl?.trim();
    if (!title || !url || !ev.dateTime) continue;

    const starts = new Date(ev.dateTime);
    if (Number.isNaN(starts.getTime())) continue;

    const description = ev.description?.trim() || null;
    const address = venueAddress(ev.venue);
    const blob = `${title} ${description ?? ""} ${address ?? ""}`;
    const fee = ev.feeSettings?.amount != null ? Number(ev.feeSettings.amount) : null;
    const inferred = inferCost(blob);
    const cost_type =
      fee != null && Number.isFinite(fee) && fee > 0 ? "pago" : inferred.cost_type;

    const lat = typeof ev.venue?.lat === "number" ? ev.venue.lat : null;
    const lng =
      typeof ev.venue?.lng === "number"
        ? ev.venue.lng
        : typeof ev.venue?.lon === "number"
          ? ev.venue.lon
          : null;

    out.push({
      title: title.slice(0, 180),
      description: description?.slice(0, 500) ?? null,
      event_type: inferType(blob),
      starts_at: starts.toISOString(),
      ends_at: null,
      address,
      lat,
      lng,
      cost_type,
      price: fee != null && Number.isFinite(fee) ? fee : inferred.price,
      source_url: cleanSourceUrl(url),
      source_name: SOURCE_NAME,
      cover_url:
        resolvePhoto(apollo, ev.featuredEventPhoto) ||
        resolvePhoto(apollo, ev.displayPhoto),
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
