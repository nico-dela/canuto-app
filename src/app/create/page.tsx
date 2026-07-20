"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CODE_KINDS, COST_TYPES, EVENT_TYPES, CITY } from "@/lib/constants";
import type { CodeKindId, CostTypeId, EventTypeId } from "@/lib/constants";

export default function CreateEventPage() {
  const router = useRouter();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [eventType, setEventType] = useState<EventTypeId>("musica");
  const [startsAt, setStartsAt] = useState("");
  const [address, setAddress] = useState("");
  const [costType, setCostType] = useState<CostTypeId>("gratis");
  const [price, setPrice] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [codeKind, setCodeKind] = useState<CodeKindId>("permanent");
  const [customCode, setCustomCode] = useState("");
  const [maxUses, setMaxUses] = useState("10");
  const [error, setError] = useState("");
  const [createdCodes, setCreatedCodes] = useState<string[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth");
      const data = await res.json();
      if (!data.profile) {
        router.replace("/auth?next=/create");
        setAuthed(false);
      } else {
        setAuthed(true);
      }
    })();
  }, [router]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const body = {
      title,
      description,
      event_type: eventType,
      starts_at: new Date(startsAt).toISOString(),
      address,
      lat: CITY.lat,
      lng: CITY.lng,
      cost_type: costType,
      price: costType === "pago" && price ? Number(price) : undefined,
      visibility,
      codes:
        visibility === "private"
          ? [
              {
                kind: codeKind,
                code: customCode || undefined,
                max_uses: codeKind === "group" ? Number(maxUses) || 10 : undefined,
              },
            ]
          : undefined,
    };
    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(typeof data.error === "string" ? data.error : "No se pudo crear");
      return;
    }
    if (data.codes?.length) {
      setCreatedCodes(data.codes.map((c: { code: string }) => c.code));
    }
    if (data.event.visibility === "public") {
      router.push(`/events/${data.event.id}`);
    }
  }

  if (authed === null) {
    return <p className="p-6 text-[13px] text-[var(--muted)]">Cargando…</p>;
  }

  if (createdCodes.length) {
    return (
      <div className="page">
        <h1 className="page-title">Privado creado</h1>
        <p className="page-sub">Compartí el código solo con quienes quieras.</p>
        <ul className="mt-6 space-y-2">
          {createdCodes.map((c) => (
            <li key={c}>
              <code className="font-mono text-lg tracking-wider">{c}</code>
            </li>
          ))}
        </ul>
        <Link href="/my" className="mt-8 inline-block text-[13px] link">
          Mis eventos
        </Link>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">Publicar evento</h1>
      <p className="page-sub">
        Para organizadores. El uso principal de Canuto es descubrir qué hay ahora.
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-1">
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Título"
          className="input"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Descripción"
          rows={3}
          className="input resize-none"
        />
        <label className="block pt-4 text-[12px] text-[var(--muted)]">
          Tipo
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value as EventTypeId)}
            className="select"
          >
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block pt-2 text-[12px] text-[var(--muted)]">
          Fecha y hora
          <input
            required
            type="datetime-local"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className="input"
          />
        </label>
        <input
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Lugar"
          className="input"
        />
        <label className="block pt-2 text-[12px] text-[var(--muted)]">
          Costo
          <select
            value={costType}
            onChange={(e) => setCostType(e.target.value as CostTypeId)}
            className="select"
          >
            {COST_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        {costType === "pago" && (
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="Precio ARS"
            className="input"
          />
        )}
        <fieldset className="space-y-2 pt-4 text-[13px]">
          <legend className="text-[12px] text-[var(--muted)]">Visibilidad</legend>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={visibility === "public"}
              onChange={() => setVisibility("public")}
            />
            Público
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              checked={visibility === "private"}
              onChange={() => setVisibility("private")}
            />
            Privado
          </label>
        </fieldset>
        {visibility === "private" && (
          <div className="space-y-1 border-t border-[var(--line)] pt-4">
            <label className="block text-[12px] text-[var(--muted)]">
              Tipo de código
              <select
                value={codeKind}
                onChange={(e) => setCodeKind(e.target.value as CodeKindId)}
                className="select"
              >
                {CODE_KINDS.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
            <input
              value={customCode}
              onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
              placeholder="Código (opcional)"
              className="input font-mono"
            />
            {codeKind === "group" && (
              <input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                placeholder="Máx. usos"
                className="input"
              />
            )}
          </div>
        )}
        {error && <p className="pt-2 text-[13px] text-red-600">{error}</p>}
        <button type="submit" className="btn mt-6 w-full">
          Publicar
        </button>
      </form>
    </div>
  );
}
