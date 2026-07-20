"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { formatWhen } from "@/lib/events/filters";
import type { CanutoEvent } from "@/lib/types";

export default function MyEventsPage() {
  const router = useRouter();
  const [created, setCreated] = useState<CanutoEvent[]>([]);
  const [going, setGoing] = useState<CanutoEvent[]>([]);
  const [unlocked, setUnlocked] = useState<CanutoEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const me = await fetch("/api/auth");
      const meData = await me.json();
      if (!meData.profile) {
        router.replace("/auth?next=/my");
        return;
      }
      const res = await fetch("/api/me/events");
      const data = await res.json();
      if (res.ok) {
        setCreated(data.created ?? []);
        setGoing(data.going ?? []);
        setUnlocked(data.unlocked ?? []);
      }
      setLoading(false);
    })();
  }, [router]);

  if (loading) return <p className="p-6 text-[13px] text-[var(--muted)]">Cargando…</p>;

  function Section({ title, items }: { title: string; items: CanutoEvent[] }) {
    return (
      <section className="mt-8">
        <h2 className="text-[13px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
          {title}
        </h2>
        {items.length === 0 ? (
          <p className="mt-3 text-[14px] font-semibold text-[var(--muted)]">Todavía nada</p>
        ) : (
          <ul className="mt-3 grid gap-3">
            {items.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}`}
                  className="block rounded-3xl bg-white px-5 py-4 shadow-[0_10px_30px_rgba(26,40,56,0.06)]"
                >
                  <p className="text-[16px] font-bold tracking-tight">{e.title}</p>
                  <p className="mt-1 text-[13px] font-semibold text-[var(--muted)]">
                    {formatWhen(e.starts_at)}
                    {e.status === "pending" ? " · pendiente" : ""}
                    {e.visibility === "private" ? " · privado" : ""}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    );
  }

  return (
    <div className="page max-w-xl">
      <h1 className="page-title">Mis planes</h1>
      <Section title="Armé" items={created} />
      <Section title="Voy" items={going} />
      <Section title="Con código" items={unlocked} />
    </div>
  );
}
