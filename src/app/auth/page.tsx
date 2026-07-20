"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import type { Profile } from "@/lib/types";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") || "/";
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [dataMode, setDataMode] = useState("");

  useEffect(() => {
    void (async () => {
      const res = await fetch("/api/auth");
      const data = await res.json();
      setProfile(data.profile);
      setDataMode(data.mode);
    })();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/auth", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode, email, password, displayName }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth", { method: "DELETE" });
    setProfile(null);
    router.refresh();
  }

  if (profile) {
    return (
      <div className="page">
        <h1 className="page-title">Hola{profile.display_name ? `, ${profile.display_name}` : ""}</h1>
        <p className="page-sub">
          {profile.email}
          {dataMode === "local" ? " · demo" : ""}
        </p>
        {dataMode === "local" && (
          <p className="mt-4 text-[13px] font-semibold text-[var(--muted)]">
            Admin: <code className="font-mono">admin@canuto.local</code>
          </p>
        )}
        <div className="mt-8 flex flex-col gap-3">
          <Link href="/my" className="btn btn-accent">
            Mis planes
          </Link>
          <button type="button" onClick={() => void logout()} className="btn-soft">
            Salir
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1 className="page-title">{mode === "login" ? "Entrar" : "Crear cuenta"}</h1>
      <p className="page-sub">Solo hace falta para armar planes, confirmar o usar códigos.</p>
      <form onSubmit={(e) => void submit(e)} className="mt-8 space-y-3">
        {mode === "register" && (
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Tu nombre"
            className="input"
          />
        )}
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="input"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Contraseña"
          required
          minLength={4}
          className="input"
        />
        {error && <p className="text-[14px] font-bold text-[var(--accent)]">{error}</p>}
        <button type="submit" className="btn btn-accent w-full">
          {mode === "login" ? "Entrar" : "Crear cuenta"}
        </button>
      </form>
      <button
        type="button"
        className="mt-6 text-[14px] font-bold link"
        onClick={() => setMode(mode === "login" ? "register" : "login")}
      >
        {mode === "login" ? "Todavía no tengo cuenta" : "Ya tengo cuenta"}
      </button>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={<p className="p-6 text-[14px] font-semibold text-[var(--muted)]">Cargando…</p>}>
      <AuthForm />
    </Suspense>
  );
}
