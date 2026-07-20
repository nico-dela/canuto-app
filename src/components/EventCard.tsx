"use client";

import Link from "next/link";
import { EventMedia } from "@/components/EventMedia";
import { formatCost, formatWhen } from "@/lib/events/filters";
import type { CanutoEvent } from "@/lib/types";

export function EventCard({
  event,
  selected,
}: {
  event: CanutoEvent;
  selected?: boolean;
  onSelect?: (id: string) => void;
  index?: number;
}) {
  const when = formatWhen(event.starts_at);
  const cost = formatCost(event);

  return (
    <Link
      href={`/events/${event.id}`}
      data-a11y-hit
      aria-label={`${event.title}. ${when}. ${cost}`}
      aria-current={selected ? "true" : undefined}
      className={`flex items-stretch gap-3 overflow-hidden rounded-2xl bg-[var(--surface)] p-2 pr-3 active:bg-[var(--line)] ${
        selected ? "ring-2 ring-[var(--accent)]" : ""
      }`}
    >
      <EventMedia
        coverUrl={event.cover_url}
        eventType={event.event_type}
        title={event.title}
        size="sm"
      />
      <div className="flex min-w-0 flex-1 flex-col justify-center py-1">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-[15px] font-bold leading-snug text-[var(--ink)]">
            {event.title}
          </h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
              event.cost_type === "gratis"
                ? "bg-[#e6f6ef] text-[var(--good)]"
                : event.cost_type === "a_la_gorra"
                  ? "bg-[#fff4d6] text-[#8a6a00]"
                  : "bg-[var(--accent-soft)] text-[var(--accent)]"
            }`}
          >
            {cost}
          </span>
        </div>
        <p className="mt-1 text-[12px] font-semibold text-[var(--muted)]">{when}</p>
      </div>
    </Link>
  );
}
