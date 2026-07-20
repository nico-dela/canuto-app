"use client";

import { useState } from "react";
import { COST_TYPES, EVENT_TYPES, type CostTypeId, type EventTypeId } from "@/lib/constants";
import type { EventFilters } from "@/lib/types";

const WHEN = [
  { id: "now", label: "Ahora" },
  { id: "today", label: "Hoy" },
  { id: "weekend", label: "Finde" },
  { id: "all", label: "Todos" },
] as const;

export function EventFiltersBar({
  filters,
  onChange,
}: {
  filters: EventFilters;
  onChange: (next: EventFilters) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-[var(--line)] px-4 py-3">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px]">
        {WHEN.map((chip) => (
          <button
            key={chip.id}
            type="button"
            onClick={() => onChange({ ...filters, when: chip.id })}
            className={
              (filters.when ?? "all") === chip.id
                ? "text-[var(--ink)] underline underline-offset-4"
                : "text-[var(--muted)] hover:text-[var(--ink)]"
            }
          >
            {chip.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto text-[var(--muted)] hover:text-[var(--ink)]"
        >
          {open ? "Menos" : "Filtros"}
        </button>
      </div>

      {open && (
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input
            value={filters.query ?? ""}
            onChange={(e) => onChange({ ...filters, query: e.target.value })}
            placeholder="Buscar…"
            className="input"
          />
          <select
            className="select"
            value={filters.types?.[0] ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                types: e.target.value ? [e.target.value as EventTypeId] : [],
              })
            }
          >
            <option value="">Tipo</option>
            {EVENT_TYPES.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
          <select
            className="select"
            value={filters.cost?.[0] ?? ""}
            onChange={(e) =>
              onChange({
                ...filters,
                cost: e.target.value ? [e.target.value as CostTypeId] : [],
              })
            }
          >
            <option value="">Costo</option>
            {COST_TYPES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
