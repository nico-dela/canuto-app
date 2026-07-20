"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";

export default function UnlockPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const me = await fetch("/api/auth");
      const meData = await me.json();
      if (!meData.profile) {
        router.push("/auth?next=/unlock");
        return;
      }
      const res = await fetch("/api/unlock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ese código no anda");
        return;
      }
      router.push(`/events/${data.eventId}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">¿Tenés un código?</h1>
      <p className="page-sub">
        Pegalo acá y te abrimos el plan privado.
      </p>
      <p className="mt-3 text-[13px] font-semibold text-[var(--muted)]">
        Demo: <code className="font-mono">AMIGOS26</code>
      </p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          className="input text-center font-mono text-xl tracking-[0.35em]"
          required
        />
        {error && <p className="text-[14px] font-bold text-[var(--accent)]">{error}</p>}
        <button type="submit" disabled={loading} className="btn btn-accent w-full">
          {loading ? "Abriendo…" : "Abrir plan"}
        </button>
      </form>
      <Link href="/" className="mt-8 inline-block text-[14px] font-bold link">
        Volver a ¿Qué hacemos?
      </Link>
    </div>
  );
}
