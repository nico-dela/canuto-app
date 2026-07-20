"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { Profile } from "@/lib/types";

export function AppNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)]"
        >
          Canuto
        </Link>
        <button
          type="button"
          aria-label="Menú"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-base text-[var(--ink)]"
        >
          {open ? "×" : "☰"}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full px-3 pb-3">
          <div className="mx-auto max-w-lg overflow-hidden rounded-2xl bg-white p-1.5 shadow-md">
            {[
              { href: "/", label: "¿Qué hacemos?" },
              { href: "/unlock", label: "Código privado" },
              { href: "/my", label: "Mis cosas" },
              { href: "/auth", label: profile ? "Cuenta" : "Entrar" },
              ...(profile
                ? [{ href: "/create", label: "Publicar (organizadores)" }]
                : []),
              ...(profile?.role === "admin"
                ? [{ href: "/admin", label: "Admin" }]
                : []),
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`block rounded-xl px-3 py-2.5 text-[14px] font-bold ${
                  pathname === item.href
                    ? "bg-[var(--accent-soft)]"
                    : "text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </header>
  );
}
