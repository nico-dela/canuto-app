"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { EventCard } from "@/components/EventCard";
import { EventListSkeleton, LoadingState, Spinner } from "@/components/Loading";
import { useA11y } from "@/components/A11yProvider";
import {
  formatDayChip,
  monthOptions,
  upcomingDays,
} from "@/lib/events/filters";
import type { CanutoEvent, EventFilters } from "@/lib/types";

const EventMap = dynamic(
  () => import("@/components/EventMap").then((m) => m.EventMap),
  {
    ssr: false,
    loading: () => (
      <LoadingState label="Cargando mapa…" className="h-full min-h-[280px] py-0" />
    ),
  },
);

type QuickWhen = "now" | "today";

export function ExploreClient() {
  const { settings } = useA11y();
  const [events, setEvents] = useState<CanutoEvent[]>([]);
  const [quick, setQuick] = useState<QuickWhen | null>("now");
  const [day, setDay] = useState<string | null>(null);
  const [month, setMonth] = useState<string | null>(null);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showMap, setShowMap] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const filters: EventFilters = useMemo(() => {
    if (month) return { when: "month", month };
    if (day) return { when: "day", date: day };
    if (quick) return { when: quick };
    return { when: "today" };
  }, [quick, day, month]);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (filters.when) params.set("when", filters.when);
    if (filters.date) params.set("date", filters.date);
    if (filters.month) params.set("month", filters.month);
    return params.toString();
  }, [filters]);

  useEffect(() => {
    let cancelled = false;
    const ctrl = new AbortController();
    void (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events?${query}`, { signal: ctrl.signal });
        const data = await res.json();
        if (cancelled) return;
        setEvents(data.events ?? []);
      } catch {
        if (!cancelled) setEvents([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      ctrl.abort();
    };
  }, [query]);

  useEffect(() => {
    if (!showMap || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => undefined,
      { enableHighAccuracy: false, timeout: 5000, maximumAge: 120000 },
    );
  }, [showMap]);

  const days = useMemo(() => upcomingDays(14).map(formatDayChip), []);
  const months = useMemo(() => monthOptions(6), []);

  const heading = useMemo(() => {
    if (month) {
      const opt = months.find((m) => m.value === month);
      return opt ? opt.label : month;
    }
    if (day) {
      const d = new Date(`${day}T12:00:00`);
      return format(d, "EEEE d MMM", { locale: es });
    }
    if (quick === "now") return "Ahora";
    return "Hoy";
  }, [quick, day, month, months]);

  function pickQuick(id: QuickWhen) {
    setQuick(id);
    setDay(null);
    setMonth(null);
    setShowMap(false);
    setSelectedId(null);
  }

  function pickDay(key: string) {
    setDay(key);
    setQuick(null);
    setMonth(null);
    setShowMap(false);
    setSelectedId(null);
  }

  function pickMonth(value: string) {
    setMonth(value);
    setQuick(null);
    setDay(null);
    setShowMap(false);
    setSelectedId(null);
  }

  const selectedEvent = events.find((e) => e.id === selectedId) ?? null;
  const statusText = loading
    ? "Buscando planes"
    : events.length === 0
      ? settings.simplified
        ? "No hay planes"
        : "Nada acá"
      : settings.simplified
        ? `${Math.min(events.length, 12)} planes`
        : `${Math.min(events.length, 12)} cerca`;

  return (
    <div className="shell min-h-[calc(100vh-64px)] px-4 pb-8 md:px-6 lg:px-8">
      <section className="pt-1 md:pt-2" aria-labelledby="explore-heading">
        <p
          className="text-[12px] font-bold uppercase tracking-[0.16em] text-[var(--muted)]"
          data-a11y-hide-simple
        >
          Córdoba
        </p>
        <h1
          id="explore-heading"
          className="mt-1 font-[family-name:var(--font-display)] text-[1.85rem] font-bold leading-tight tracking-tight md:text-[2.4rem]"
        >
          ¿Qué hacemos?
        </h1>
      </section>

      <div
        className="mt-4 flex flex-wrap items-center gap-1.5"
        role="group"
        aria-label="Filtrar por momento"
      >
        {(
          [
            { id: "now" as const, label: "Ahora" },
            { id: "today" as const, label: "Hoy" },
          ]
        ).map((chip) => {
          const active = quick === chip.id && !day && !month;
          return (
            <button
              key={chip.id}
              type="button"
              aria-pressed={active}
              onClick={() => pickQuick(chip.id)}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${
                active
                  ? "bg-[var(--ink)] text-white"
                  : "bg-[var(--surface)] text-[var(--muted)]"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-expanded={showMore}
          aria-controls="more-days"
          onClick={() => setShowMore((v) => !v)}
          className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${
            showMore || day || month
              ? "bg-[var(--accent-soft)] text-[var(--ink)]"
              : "bg-[var(--surface)] text-[var(--muted)]"
          }`}
        >
          Más días
        </button>
      </div>

      {showMore && (
        <div id="more-days" className="mt-3 space-y-3">
          <div
            className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:-mx-6 md:px-6 lg:-mx-8 lg:px-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="listbox"
            aria-label="Elegir día"
          >
            {days.map((d) => {
              const active = day === d.key;
              return (
                <button
                  key={d.key}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pickDay(d.key)}
                  className={`flex min-w-[3.1rem] flex-col items-center rounded-2xl px-2 py-2 ${
                    active
                      ? "bg-[var(--ink)] text-white"
                      : "bg-[var(--surface)] text-[var(--ink)]"
                  }`}
                >
                  <span className="text-[11px] font-bold uppercase opacity-70">
                    {d.label}
                  </span>
                  <span className="text-[15px] font-extrabold leading-none">{d.sub}</span>
                </button>
              );
            })}
          </div>
          <label className="flex items-center gap-2 text-[13px] font-semibold text-[var(--muted)]">
            Mes
            <select
              className="flex-1 rounded-xl border-0 bg-[var(--surface)] px-3 py-2 text-[13px] font-bold text-[var(--ink)]"
              value={month ?? ""}
              onChange={(e) => {
                if (e.target.value) pickMonth(e.target.value);
              }}
            >
              <option value="">Elegir mes…</option>
              {months.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      <section className="mt-6" aria-labelledby="results-heading">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <div>
            <h2
              id="results-heading"
              className="text-[1rem] font-extrabold capitalize tracking-tight"
            >
              {heading}
            </h2>
            <p
              className="flex items-center gap-1.5 text-[12px] font-semibold text-[var(--muted)]"
              aria-live="polite"
              aria-atomic="true"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Buscando
                </>
              ) : (
                statusText
              )}
            </p>
          </div>
          <button
            type="button"
            aria-pressed={showMap}
            onClick={() => {
              setShowMap((v) => !v);
              setSelectedId(null);
            }}
            className="text-[12px] font-bold text-[var(--muted)]"
          >
            {showMap ? "Lista" : "Mapa"}
          </button>
        </div>

        {showMap ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-[var(--surface)]">
              <div className="relative h-[280px] md:h-[420px] lg:h-[520px]">
                {loading && (
                  <div className="absolute inset-0 z-10 flex items-center justify-center bg-[var(--surface)]/80 backdrop-blur-[1px]">
                    <LoadingState label="Buscando planes…" className="py-0" />
                  </div>
                )}
                <EventMap
                  events={events}
                  selectedId={selectedId}
                  userLocation={userLocation}
                  onSelect={setSelectedId}
                />
              </div>
            </div>
            {selectedEvent ? (
              <EventCard event={selectedEvent} selected />
            ) : (
              <p className="px-1 text-[13px] font-semibold text-[var(--muted)]">
                {settings.simplified
                  ? "Elegí un punto del mapa."
                  : "Tocá un punto para ver el plan."}
              </p>
            )}
          </div>
        ) : loading ? (
          <EventListSkeleton count={6} />
        ) : events.length === 0 ? (
          <div className="rounded-2xl bg-[var(--surface)] px-4 py-6" role="status">
            <p className="text-[15px] font-bold">No hay nada en este momento.</p>
            <p className="mt-1 text-[13px] font-semibold text-[var(--muted)]" data-a11y-hide-simple>
              Probá otro día.
            </p>
          </div>
        ) : (
          <div className="grid gap-2 md:grid-cols-2" role="list">
            {events.slice(0, 12).map((event, index) => (
              <div key={event.id} role="listitem">
                <EventCard event={event} index={index} />
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-6 text-center text-[13px] font-semibold text-[var(--muted)]">
        ¿Te pasaron un código?{" "}
        <Link href="/unlock" className="font-bold text-[var(--ink)] underline underline-offset-2">
          Abrirlo
        </Link>
      </p>
    </div>
  );
}
