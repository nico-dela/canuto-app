export const EVENT_TYPES = [
  { id: "musica", label: "Música" },
  { id: "teatro", label: "Teatro" },
  { id: "cine", label: "Cine" },
  { id: "fiesta", label: "Fiesta / boliche" },
  { id: "deporte", label: "Deporte" },
  { id: "gastronomico", label: "Gastronómico" },
  { id: "feria", label: "Feria" },
  { id: "exposicion", label: "Exposición" },
  { id: "infantil", label: "Infantil / familiar" },
  { id: "otro", label: "Otro" },
] as const;

export type EventTypeId = (typeof EVENT_TYPES)[number]["id"];

export const COST_TYPES = [
  { id: "gratis", label: "Gratis" },
  { id: "a_la_gorra", label: "A la gorra" },
  { id: "pago", label: "Pago" },
] as const;

export type CostTypeId = (typeof COST_TYPES)[number]["id"];

export const CODE_KINDS = [
  { id: "one_time", label: "Un solo uso" },
  { id: "group", label: "Por grupo" },
  { id: "permanent", label: "Permanente" },
] as const;

export type CodeKindId = (typeof CODE_KINDS)[number]["id"];

/** Córdoba Capital center */
export const CITY = {
  name: "Córdoba Capital",
  lat: -31.4201,
  lng: -64.1888,
  zoom: 12,
} as const;

export function eventTypeLabel(id: string) {
  return EVENT_TYPES.find((t) => t.id === id)?.label ?? id;
}

export function costTypeLabel(id: string) {
  return COST_TYPES.find((t) => t.id === id)?.label ?? id;
}
