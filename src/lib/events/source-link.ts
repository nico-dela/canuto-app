import type { CanutoEvent } from "@/lib/types";

type SourceFields = Pick<
  CanutoEvent,
  "source" | "source_url" | "source_name" | "cost_type"
>;

/** Original page URL for scraped events (null for organizer-only). */
export function eventSourceHref(event: SourceFields): string | null {
  if (event.source !== "scrape") return null;
  const href = event.source_url?.trim();
  return href || null;
}

/**
 * Soft CTA to the scrape source when there is no paid ticket button
 * (ticket CTA already uses `source_url` for paid scrapes).
 */
export function eventSourceDetailCta(event: SourceFields): {
  href: string;
  label: string;
} | null {
  const href = eventSourceHref(event);
  if (!href) return null;
  if (event.cost_type === "pago") return null;

  const name = event.source_name?.trim();
  return {
    href,
    label: name ? `Más info en ${name}` : "Ver fuente original",
  };
}
