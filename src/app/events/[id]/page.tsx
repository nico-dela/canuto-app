"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { LoadingState } from "@/components/Loading";
import { formatCost, formatWhen } from "@/lib/events/filters";
import type { CanutoEvent, EventAccessCode, Profile } from "@/lib/types";

function ticketLabel(event: CanutoEvent) {
  if (event.source === "scrape") return "Ver entradas";
  return "Comprar entrada";
}

export default function EventDetailPage() {
  const params = useParams<{ id: string }>();
  const [event, setEvent] = useState<CanutoEvent | null>(null);
  const [codes, setCodes] = useState<EventAccessCode[] | undefined>();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [rsvping, setRsvping] = useState(false);

  useEffect(() => {
    void (async () => {
      const [evRes, meRes] = await Promise.all([
        fetch(`/api/events/${params.id}`),
        fetch("/api/auth"),
      ]);
      const evData = await evRes.json();
      const meData = await meRes.json();
      if (!evRes.ok) {
        setError(evData.error || "No encontrado");
        return;
      }
      setEvent(evData.event);
      setCodes(evData.codes);
      setProfile(meData.profile);
    })();
  }, [params.id]);

  async function rsvp() {
    setMessage("");
    setRsvping(true);
    try {
      const res = await fetch(`/api/events/${params.id}/rsvp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "going" }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || "Error");
        return;
      }
      setMessage("¡Listo, confirmaste que vas!");
    } finally {
      setRsvping(false);
    }
  }

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

  const mapsUrl =
    event.lat != null && event.lng != null
      ? `https://www.openstreetmap.org/directions?to=${event.lat}%2C${event.lng}`
      : event.address
        ? `https://www.openstreetmap.org/search?query=${encodeURIComponent(`${event.address}, Córdoba`)}`
        : null;

  const isPaid = event.cost_type === "pago";
  const isPrivate = event.visibility === "private";
  const ticketUrl = event.source_url;
  const showTicket = isPaid && Boolean(ticketUrl);
  const showRsvp = isPrivate;
  const authNext = `/auth?next=${encodeURIComponent(`/events/${event.id}`)}`;

  return (
    <div className="page">
      <Link href="/" className="text-[14px] font-bold text-[var(--muted)]">
        ← Planes
      </Link>

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

        {showRsvp &&
          (profile ? (
            <button
              type="button"
              onClick={() => void rsvp()}
              disabled={rsvping}
              className={`btn ${showTicket ? "btn-soft" : "btn-accent"}`}
            >
              {rsvping ? "Confirmando…" : "Voy"}
            </button>
          ) : (
            <Link
              href={authNext}
              className={`btn ${showTicket ? "btn-soft" : "btn-accent"}`}
            >
              Entrar para confirmar
            </Link>
          ))}

        {mapsUrl && (
          <a href={mapsUrl} target="_blank" rel="noreferrer" className="btn-soft">
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

      {event.source_name && event.source === "scrape" && (
        <p className="mt-8 text-[12px] font-semibold text-[var(--muted)]">
          Fuente: {event.source_name}
        </p>
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
