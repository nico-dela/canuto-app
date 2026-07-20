"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { formatWhen } from "@/lib/events/filters";
import type { CanutoEvent } from "@/lib/types";

export default function AdminPage() {
  const router = useRouter();
  const [events, setEvents] = useState<CanutoEvent[]>([]);
  const [error, setError] = useState("");
  const [scrapeMsg, setScrapeMsg] = useState("");

  const load = useCallback(async () => {
    const me = await fetch("/api/auth");
    const meData = await me.json();
    if (!meData.profile) {
      router.replace("/auth?next=/admin");
      return;
    }
    if (meData.profile.role !== "admin") {
      setError("Solo administradores");
      return;
    }
    const res = await fetch("/api/admin/events");
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setEvents(data.events ?? []);
  }, [router]);

  useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, status: "approved" | "rejected") {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await load();
  }

  async function runScrape() {
    setScrapeMsg("Ejecutando…");
    const res = await fetch("/api/scrape", { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setScrapeMsg(data.error || "Error");
      return;
    }
    setScrapeMsg(`${data.total} procesados`);
  }

  if (error) {
    return <p className="p-6 text-[13px] text-red-600">{error}</p>;
  }

  return (
    <div className="page max-w-xl">
      <h1 className="page-title">Moderación</h1>
      <p className="page-sub">Aprobar o rechazar públicos pendientes.</p>

      <div className="mt-8 border-y border-[var(--line)] py-4">
        <p className="text-[13px] text-[var(--muted)]">Scrapers Córdoba</p>
        <button type="button" onClick={() => void runScrape()} className="btn mt-3">
          Correr scrapers
        </button>
        {scrapeMsg && <p className="mt-2 text-[12px] text-[var(--muted)]">{scrapeMsg}</p>}
      </div>

      <ul className="mt-8 space-y-6">
        {events.length === 0 ? (
          <li className="text-[13px] text-[var(--muted)]">Sin pendientes</li>
        ) : (
          events.map((e) => (
            <li key={e.id} className="border-b border-[var(--line)] pb-6">
              <p className="text-[15px] font-medium tracking-tight">{e.title}</p>
              <p className="mt-1 text-[13px] text-[var(--muted)]">{formatWhen(e.starts_at)}</p>
              {e.description && (
                <p className="mt-2 text-[14px] leading-relaxed">{e.description}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => void moderate(e.id, "approved")}
                  className="btn"
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  onClick={() => void moderate(e.id, "rejected")}
                  className="btn-ghost"
                >
                  Rechazar
                </button>
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
