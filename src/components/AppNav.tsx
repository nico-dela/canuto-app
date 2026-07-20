"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import {
  AccessibilityTrigger,
} from "@/components/AccessibilityPanel";
import type { Profile } from "@/lib/types";

function navItems(profile: Profile | null, mobile: boolean) {
  return [
    { href: "/", label: mobile ? "¿Qué hacemos?" : "Planes" },
    { href: "/unlock", label: mobile ? "Código privado" : "Código" },
    { href: "/my", label: "Mis cosas" },
    { href: "/auth", label: profile ? "Cuenta" : "Entrar" },
    ...(profile
      ? [{ href: "/create", label: mobile ? "Publicar (organizadores)" : "Publicar" }]
      : []),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];
}

export function AppNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    }
    function onClick(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  const desktop = navItems(profile, false);
  const mobile = navItems(profile, true);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="shell flex items-center justify-between gap-2 px-4 py-3 md:px-6 lg:px-8">
        <Link
          href="/"
          className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)] md:text-2xl"
        >
          Canuto
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
          {desktop.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`rounded-full px-3 py-1.5 text-[13px] font-bold ${
                pathname === item.href
                  ? "bg-[var(--ink)] text-[var(--on-ink)]"
                  : "text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <AccessibilityTrigger />
        </nav>
        <div className="flex items-center gap-2 md:hidden">
          <AccessibilityTrigger compact />
          <button
            ref={buttonRef}
            type="button"
            aria-label={open ? "Cerrar menú" : "Abrir menú"}
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-base text-[var(--ink)]"
          >
            <span aria-hidden>{open ? "×" : "☰"}</span>
          </button>
        </div>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-full px-3 pb-3 md:hidden" ref={menuRef}>
          <nav
            id={menuId}
            aria-label="Menú móvil"
            className="shell overflow-hidden rounded-2xl bg-[var(--surface)] p-1.5 shadow-md"
          >
            {mobile.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                aria-current={pathname === item.href ? "page" : undefined}
                className={`block rounded-xl px-3 py-2.5 text-[14px] font-bold ${
                  pathname === item.href
                    ? "bg-[var(--accent-soft)]"
                    : "text-[var(--ink)]"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}
