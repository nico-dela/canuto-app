"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AccessibilityTrigger,
} from "@/components/AccessibilityPanel";
import type { Profile } from "@/lib/types";

function navItems(profile: Profile | null) {
  return [
    { href: "/", label: "Planes" },
    { href: "/unlock", label: "Código" },
    { href: "/my", label: "Mis cosas" },
    { href: "/auth", label: profile ? "Cuenta" : "Entrar" },
    ...(profile ? [{ href: "/create", label: "Publicar" }] : []),
    ...(profile?.role === "admin" ? [{ href: "/admin", label: "Admin" }] : []),
  ];
}

export function AppNav({ profile }: { profile: Profile | null }) {
  const pathname = usePathname();
  const items = navItems(profile);

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/95 backdrop-blur-sm">
      <div className="shell flex flex-col gap-2 px-4 py-3 md:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-bold tracking-tight text-[var(--ink)] md:text-2xl"
          >
            Canuto
          </Link>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Principal">
            {items.map((item) => (
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
          <div className="md:hidden">
            <AccessibilityTrigger compact />
          </div>
        </div>

        <nav
          className="-mx-1 flex items-center gap-1 overflow-x-auto px-1 pb-0.5 md:hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          aria-label="Principal"
        >
          {items.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              aria-current={pathname === item.href ? "page" : undefined}
              className={`shrink-0 rounded-full px-3 py-1.5 text-[13px] font-bold ${
                pathname === item.href
                  ? "bg-[var(--ink)] text-[var(--on-ink)]"
                  : "text-[var(--muted)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
