"use client";

import { useEffect, useId, useRef } from "react";
import { useA11y } from "@/components/A11yProvider";
import type { ContrastMode, TextSize } from "@/lib/a11y";

function Toggle({
  id,
  checked,
  onChange,
  label,
  description,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description: string;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl bg-[var(--surface)] px-4 py-3"
    >
      <span className="min-w-0">
        <span className="block text-[15px] font-bold text-[var(--ink)]">{label}</span>
        <span className="mt-0.5 block text-[13px] font-semibold text-[var(--muted)]">
          {description}
        </span>
      </span>
      <span className="relative mt-0.5 shrink-0">
        <input
          id={id}
          type="checkbox"
          className="peer sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <span
          aria-hidden
          className="block h-7 w-12 rounded-full bg-[var(--line)] transition-colors peer-checked:bg-[var(--accent)] peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--ink)]"
        />
        <span
          aria-hidden
          className="pointer-events-none absolute left-0.5 top-0.5 h-6 w-6 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5"
        />
      </span>
    </label>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const groupId = useId();
  return (
    <fieldset className="rounded-2xl bg-[var(--surface)] px-4 py-3">
      <legend className="text-[15px] font-bold text-[var(--ink)]">{label}</legend>
      <div
        className="mt-2 flex flex-wrap gap-1.5"
        role="radiogroup"
        aria-labelledby={groupId}
      >
        <span id={groupId} className="sr-only">
          {label}
        </span>
        {options.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.value)}
              className={`rounded-full px-3 py-2 text-[13px] font-bold ${
                active
                  ? "bg-[var(--ink)] text-white"
                  : "bg-[var(--bg)] text-[var(--muted)]"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function AccessibilityPanel() {
  const { settings, update, reset, panelOpen, setPanelOpen } = useA11y();
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!panelOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPanelOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [panelOpen, setPanelOpen]);

  if (!panelOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center sm:items-center sm:p-4">
      <button
        type="button"
        className="absolute inset-0 bg-[var(--ink)]/45"
        aria-label="Cerrar panel de accesibilidad"
        onClick={() => setPanelOpen(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative z-[61] flex max-h-[min(92vh,720px)] w-full max-w-lg flex-col rounded-t-3xl bg-[var(--bg)] shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--line)] px-5 py-4">
          <div>
            <h2 id={titleId} className="text-[1.25rem] font-extrabold tracking-tight">
              Accesibilidad
            </h2>
            <p className="mt-1 text-[13px] font-semibold text-[var(--muted)]">
              Ajustá la app según lo que necesites. Se guarda en este dispositivo.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={() => setPanelOpen(false)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface)] text-xl font-bold text-[var(--ink)]"
            aria-label="Cerrar"
          >
            ×
          </button>
        </div>

        <div className="space-y-3 overflow-y-auto px-5 py-4">
          <p className="text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
            Visión
          </p>
          <Segmented<ContrastMode>
            label="Contraste"
            value={settings.contrast}
            onChange={(v) => update("contrast", v)}
            options={[
              { value: "default", label: "Normal" },
              { value: "high", label: "Alto" },
              { value: "dark", label: "Oscuro" },
            ]}
          />
          <Segmented<TextSize>
            label="Tamaño del texto"
            value={settings.textSize}
            onChange={(v) => update("textSize", v)}
            options={[
              { value: "default", label: "Normal" },
              { value: "large", label: "Grande" },
              { value: "xlarge", label: "Muy grande" },
            ]}
          />
          <Toggle
            id="a11y-dyslexia"
            checked={settings.dyslexiaFont}
            onChange={(v) => update("dyslexiaFont", v)}
            label="Fuente legible"
            description="Tipografía más clara para dislexia o fatiga visual."
          />
          <Toggle
            id="a11y-links"
            checked={settings.underlineLinks}
            onChange={(v) => update("underlineLinks", v)}
            label="Subrayar enlaces"
            description="Los vínculos se marcan siempre, no solo por color."
          />
          <Toggle
            id="a11y-cb"
            checked={settings.colorBlind}
            onChange={(v) => update("colorBlind", v)}
            label="Modo daltonismo"
            description="Colores con más contraste y menos dependencia del rojo-verde."
          />

          <p className="pt-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
            Motora y vestibular
          </p>
          <Toggle
            id="a11y-targets"
            checked={settings.bigTargets}
            onChange={(v) => update("bigTargets", v)}
            label="Botones más grandes"
            description="Áreas táctiles y de clic más amplias."
          />
          <Toggle
            id="a11y-motion"
            checked={settings.reduceMotion}
            onChange={(v) => update("reduceMotion", v)}
            label="Menos movimiento"
            description="Sin animaciones ni desplazamientos bruscos del mapa."
          />
          <Toggle
            id="a11y-focus"
            checked={settings.strongFocus}
            onChange={(v) => update("strongFocus", v)}
            label="Foco bien visible"
            description="Resalta fuerte el elemento seleccionado con teclado."
          />

          <p className="pt-2 text-[12px] font-extrabold uppercase tracking-[0.14em] text-[var(--muted)]">
            Cognitiva
          </p>
          <Toggle
            id="a11y-simple"
            checked={settings.simplified}
            onChange={(v) => update("simplified", v)}
            label="Interfaz simple"
            description="Menos detalles visuales y textos más directos."
          />

          <p className="rounded-2xl bg-[var(--surface)] px-4 py-3 text-[13px] font-semibold leading-snug text-[var(--muted)]">
            Tip: podés ampliar toda la página con pellizco o Ctrl/Cmd + en el
            navegador. Canuto no bloquea el zoom.
          </p>
        </div>

        <div className="flex gap-2 border-t border-[var(--line)] px-5 py-4">
          <button type="button" className="btn-soft flex-1" onClick={reset}>
            Restablecer
          </button>
          <button
            type="button"
            className="btn btn-accent flex-1"
            onClick={() => setPanelOpen(false)}
          >
            Listo
          </button>
        </div>
      </div>
    </div>
  );
}

export function AccessibilityTrigger({
  className = "",
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  const { setPanelOpen } = useA11y();
  return (
    <button
      type="button"
      onClick={() => setPanelOpen(true)}
      aria-haspopup="dialog"
      aria-label="Abrir opciones de accesibilidad"
      title="Accesibilidad"
      className={
        className ||
        (compact
          ? "flex h-9 w-9 items-center justify-center rounded-full bg-[var(--surface)] text-[15px] font-extrabold text-[var(--ink)]"
          : "rounded-full px-3 py-1.5 text-[13px] font-bold text-[var(--muted)] hover:text-[var(--ink)]")
      }
    >
      {compact ? <span aria-hidden>Aa</span> : "Accesibilidad"}
    </button>
  );
}
