"use client";

import Link from "next/link";
import { formatCost, formatWhen } from "@/lib/events/filters";
import type { CanutoEvent } from "@/lib/types";

export function EventCard({
  event,
}: {
  event: CanutoEvent;
  selected?: boolean;
  onSelect?: (id: string) => void;
  index?: number;
}) {
  return (
    <Link
      href={`/events/${event.id}`}
      className="flex items-start justify-between gap-3 rounded-2xl bg-white px-4 py-3 active:bg-[var(--line)]"
    >
      <div className="min-w-0">
        <h3 className="truncate text-[15px] font-bold leading-snug text-[var(--ink)]">
          {event.title}
        </h3>
        <p className="mt-1 text-[12px] font-semibold text-[var(--muted)]">
          {formatWhen(event.starts_at)}
        </p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
          event.cost_type === "gratis"
            ? "bg-[#e6f6ef] text-[var(--good)]"
            : event.cost_type === "a_la_gorra"
              ? "bg-[#fff4d6] text-[#8a6a00]"
              : "bg-[var(--accent-soft)] text-[var(--accent)]"
        }`}
      >
        {formatCost(event)}
      </span>
    </Link>
  );
}
