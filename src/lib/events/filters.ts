import type { CanutoEvent, EventFilters } from "../types";
import {
  addDays,
  addHours,
  endOfDay,
  endOfMonth,
  format,
  isSaturday,
  isSunday,
  nextSaturday,
  parseISO,
  startOfDay,
  startOfMonth,
} from "date-fns";
import { es } from "date-fns/locale";

export function filterEvents(events: CanutoEvent[], filters: EventFilters): CanutoEvent[] {
  const now = new Date();
  return events.filter((event) => {
    if (filters.types?.length && !filters.types.includes(event.event_type)) {
      return false;
    }
    if (filters.cost?.length && !filters.cost.includes(event.cost_type)) {
      return false;
    }
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const hay = `${event.title} ${event.description ?? ""} ${event.address ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    const start = new Date(event.starts_at);
    if (filters.when === "now") {
      const windowEnd = addHours(now, 3);
      return start >= now && start <= windowEnd;
    }
    if (filters.when === "today") {
      return start >= startOfDay(now) && start <= endOfDay(now);
    }
    if (filters.when === "weekend") {
      const sat = isSaturday(now) || isSunday(now) ? startOfDay(now) : nextSaturday(now);
      const sunEnd = endOfDay(new Date(sat.getTime() + 24 * 60 * 60 * 1000));
      return start >= sat && start <= sunEnd;
    }
    if (filters.when === "day" && filters.date) {
      const day = startOfDay(parseISO(filters.date));
      return start >= day && start <= endOfDay(day);
    }
    if (filters.when === "month" && filters.month) {
      const [y, m] = filters.month.split("-").map(Number);
      const monthStart = startOfMonth(new Date(y, m - 1, 1));
      const monthEnd = endOfMonth(monthStart);
      return start >= monthStart && start <= monthEnd;
    }
    return true;
  });
}

export function formatCost(event: CanutoEvent): string {
  if (event.cost_type === "gratis") return "Gratis";
  if (event.cost_type === "a_la_gorra") return "A la gorra";
  if (event.price != null) {
    return `$${event.price.toLocaleString("es-AR")}`;
  }
  return "Pago";
}

export function formatWhen(iso: string): string {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function formatDayChip(d: Date): { key: string; label: string; sub: string } {
  return {
    key: format(d, "yyyy-MM-dd"),
    label: format(d, "EEE", { locale: es }).replace(".", ""),
    sub: format(d, "d"),
  };
}

export function upcomingDays(count = 14): Date[] {
  const start = startOfDay(new Date());
  return Array.from({ length: count }, (_, i) => addDays(start, i));
}

export function monthOptions(count = 6): Array<{ value: string; label: string }> {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const m = startOfMonth(new Date(now.getFullYear(), now.getMonth() + i, 1));
    return {
      value: format(m, "yyyy-MM"),
      label: format(m, "MMMM yyyy", { locale: es }),
    };
  });
}
