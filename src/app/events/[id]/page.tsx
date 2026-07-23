"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/Loading";
import { EventMedia } from "@/components/EventMedia";
import { formatCost, formatWhen } from "@/lib/events/filters";
import {
  eventSourceDetailCta,
  eventSourceHref,
} from "@/lib/events/source-link";
import {
  buildGoogleMapsDirectionsUrl,
  hasDirectionsTarget,
} from "@/lib/maps";
import type { CanutoEvent, EventAccessCode } from "@/lib/types";

function ticketLabel(event: CanutoEvent) {
  if (event.source === "scrape") return "Ver entradas";
  return "Comprar entrada";
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<CanutoEvent | null>(null);
  const [codes, setCodes] = useState<EventAccessCode[] | undefined>();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void (async () => {
      const evRes = await fetch(`/api/events/${params.id}`);
      const evData = await evRes.json();
      if (!evRes.ok) {
        setError(evData.error || "No encontrado");
        return;
      }
      setEvent(evData.event);
      setCodes(evData.codes);
    })();
  }, [params.id]);

  if (error) {
    return (
      <div className="page">
        <p className="page-sub">{error}</p>
        <Link href="/" className="btn mt-6">
          Volver
        </Link>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="page">
        <LoadingState label="Cargando plan…" />
      </div>
    );
  }

  const mapsUrl = buildGoogleMapsDirectionsUrl({
    lat: event.lat,
    lng: event.lng,
    address: event.address,
  });
  const canOpenMaps = hasDirectionsTarget({
    lat: event.lat,
    lng: event.lng,
    address: event.address,
  });

  const isPaid = event.cost_type === "pago";
  const isPrivate = event.visibility === "private";
  const ticketUrl = event.source_url;
  const showTicket = isPaid && Boolean(ticketUrl);
  const sourceHref = eventSourceHref(event);
  const sourceCta = eventSourceDetailCta(event);

  return (
    <div className="page">
      <Link href="/" className="text-[14px] font-bold text-[var(--muted)]">
        ← Planes
      </Link>

      <div className="mt-4">
        <EventMedia
          coverUrl={event.cover_url}
          eventType={event.event_type}
          title={event.title}
          size="lg"
        />
      </div>

      <p className="mt-5 text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--accent)]">
        {formatCost(event)}
        {isPrivate ? " · Privado" : ""}
      </p>
      <h1 className="page-title mt-2">{event.title}</h1>
      <p className="mt-3 text-[1.05rem] font-bold text-[var(--ink)]">
        {formatWhen(event.starts_at)}
      </p>
      {event.address && (
        <p className="mt-1 text-[15px] font-semibold text-[var(--muted)]">{event.address}</p>
      )}

      {event.description && (
        <p className="mt-6 text-[16px] leading-relaxed text-[var(--ink)]/90">
          {event.description}
        </p>
      )}

      <div className="mt-8 flex flex-col gap-3">
        {showTicket && (
          <a
            href={ticketUrl!}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-accent"
          >
            {ticketLabel(event)}
          </a>
        )}

        {isPaid && !ticketUrl && (
          <p className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-[14px] font-semibold text-[var(--muted)]">
            Este plan es pago. Todavía no hay un link de compra publicado.
          </p>
        )}

        {sourceCta && (
          <a
            href={sourceCta.href}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-soft"
          >
            {sourceCta.label}
          </a>
        )}

        {canOpenMaps && mapsUrl && (
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-soft"
          >
            Cómo llegar
          </a>
        )}
        <button
          type="button"
          className="btn-soft"
          onClick={async () => {
            const url = window.location.href;
            if (navigator.share) {
              await navigator.share({ title: event.title, url });
            } else {
              await navigator.clipboard.writeText(url);
              setMessage("Link copiado");
            }
          }}
        >
          Compartir con el grupo
        </button>
      </div>

      {message && (
        <p className="mt-4 text-center text-[14px] font-bold text-[var(--good)]">{message}</p>
      )}

      {codes && codes.length > 0 && (
        <div className="mt-8 rounded-3xl bg-[var(--surface)] p-5 shadow-[0_10px_30px_rgba(26,40,56,0.06)]">
          <p className="text-[13px] font-extrabold uppercase tracking-wide text-[var(--muted)]">
            Códigos
          </p>
          <ul className="mt-3 space-y-2">
            {codes.map((c) => (
              <li key={c.id} className="flex justify-between gap-2 text-[15px] font-bold">
                <code className="font-mono tracking-wider">{c.code}</code>
                <span className="text-[13px] font-semibold text-[var(--muted)]">{c.kind}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
