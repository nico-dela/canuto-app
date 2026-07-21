import {
  cleanSourceUrl,
  inferCost,
  inferType,
  type ScrapedEvent,
} from "../normalize";

const DAY_NAMES: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miercoles: 3,
  miércoles: 3,
  jueves: 4,
  viernes: 5,
  sabado: 6,
  sábado: 6,
};

const MONTH_NAMES: Record<string, number> = {
  enero: 0,
  ene: 0,
  febrero: 1,
  feb: 1,
  marzo: 2,
  mar: 2,
  abril: 3,
  abr: 3,
  mayo: 4,
  may: 4,
  junio: 5,
  jun: 5,
  julio: 6,
  jul: 6,
  agosto: 7,
  ago: 7,
  septiembre: 8,
  sept: 8,
  sep: 8,
  octubre: 9,
  oct: 9,
  noviembre: 10,
  nov: 10,
  diciembre: 11,
  dic: 11,
};

export type ParseAgendaContext = {
  handle: string;
  postUrl: string;
  coverUrl: string;
  caption?: string | null;
  /** Anchor date for resolving weekday-only lines (defaults to now). */
  now?: Date;
};

type DayBlock = {
  date: Date;
  lines: string[];
};

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim();
}

/** Extract clock time; requires hs/h/horas or HH:MM to avoid matching day numbers. */
export function parseTime(text: string): { hours: number; minutes: number } | null {
  const m = text
    .toLowerCase()
    .match(/\b(\d{1,2}):(\d{2})\b|\b(\d{1,2})\s*(?:hs?|h\b|horas?)\b/);
  if (!m) return null;
  const hours = Number(m[1] ?? m[3]);
  const minutes = m[2] != null ? Number(m[2]) : 0;
  if (!Number.isFinite(hours) || hours > 23 || minutes > 59) return null;
  return { hours, minutes };
}

function nextDateForWeekday(
  weekday: number,
  dayOfMonth: number | null,
  now: Date,
): Date {
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  for (let i = 0; i < 21; i++) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + i);
    if (candidate.getDay() !== weekday) continue;
    if (dayOfMonth != null && candidate.getDate() !== dayOfMonth) continue;
    return candidate;
  }
  for (let i = 0; i < 14; i++) {
    const candidate = new Date(base);
    candidate.setDate(base.getDate() + i);
    if (candidate.getDay() === weekday) return candidate;
  }
  return base;
}

export function parseDayHeader(line: string, now: Date): Date | null {
  const lower = stripDiacritics(line.toLowerCase());

  const dayMatch = lower.match(
    /\b(domingo|lunes|martes|miercoles|jueves|viernes|sabado)\b(?:\s+(\d{1,2}))?(?:\s*(?:de\s+)?([a-z]+))?/,
  );
  if (dayMatch) {
    const weekday = DAY_NAMES[dayMatch[1]];
    if (weekday == null) return null;
    const dayOfMonth = dayMatch[2] ? Number(dayMatch[2]) : null;
    const monthName = dayMatch[3];
    if (monthName && MONTH_NAMES[monthName] != null && dayOfMonth != null) {
      let year = now.getFullYear();
      const month = MONTH_NAMES[monthName];
      let date = new Date(year, month, dayOfMonth, 12, 0);
      if (date.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000) {
        year += 1;
        date = new Date(year, month, dayOfMonth, 12, 0);
      }
      return date;
    }
    return nextDateForWeekday(weekday, dayOfMonth, now);
  }

  const numeric = lower.match(
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/,
  );
  if (numeric) {
    const day = Number(numeric[1]);
    const month = Number(numeric[2]) - 1;
    let year = numeric[3]
      ? Number(numeric[3].length === 2 ? `20${numeric[3]}` : numeric[3])
      : now.getFullYear();
    let date = new Date(year, month, day, 12, 0);
    if (
      !numeric[3] &&
      date.getTime() < now.getTime() - 7 * 24 * 60 * 60 * 1000
    ) {
      year += 1;
      date = new Date(year, month, day, 12, 0);
    }
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  return null;
}

function isDayHeaderLine(line: string, now: Date): boolean {
  return parseDayHeader(line, now) != null && line.length < 80;
}

function extractAddress(text: string): string | null {
  const at = text.match(
    /(?:@|en)\s+([A-ZÁÉÍÓÚÑ][\wÁÉÍÓÚáéíóúñ\s.'-]{2,60})/,
  );
  if (at) return at[1].trim();
  const known = [
    /parque las heras/i,
    /teatro (?:del )?libertador/i,
    /teatro comedia/i,
    /centro cultural c[oó]rdoba/i,
    /cabildo/i,
    /paseo del buen pastor/i,
    /museo juan de tejeda/i,
  ];
  for (const re of known) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

function isCostOnlyLine(line: string): boolean {
  const lower = line.toLowerCase();
  if (/gratis|gratuita|gorra|entrada libre/.test(lower)) return true;
  if (/^\$\s*[\d.]+/.test(line)) return true;
  if (/^\d+\s*(pesos|ars)/i.test(line)) return true;
  return false;
}

function splitDayBlocks(lines: string[], now: Date): DayBlock[] {
  const blocks: DayBlock[] = [];
  let current: DayBlock | null = null;

  for (const raw of lines) {
    const line = normalizeLine(raw);
    if (!line) continue;
    if (isDayHeaderLine(line, now)) {
      const date = parseDayHeader(line, now);
      if (!date) continue;
      current = { date, lines: [] };
      blocks.push(current);
      const rest = line
        .replace(
          /^(domingo|lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado)\b[^a-zA-ZáéíóúÁÉÍÓÚñÑ]*/i,
          "",
        )
        .trim();
      if (
        rest.length > 8 &&
        !/^\d{1,2}(?:\s*de\s+[a-záéíóú]+)?$/i.test(rest)
      ) {
        current.lines.push(rest);
      }
      continue;
    }
    if (current) current.lines.push(line);
  }
  return blocks;
}

function chunkLines(lines: string[]): string[][] {
  const chunks: string[][] = [];
  let buf: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    buf.push(line);
    if (!parseTime(line)) continue;
    while (i + 1 < lines.length && isCostOnlyLine(lines[i + 1])) {
      i += 1;
      buf.push(lines[i]);
    }
    chunks.push(buf);
    buf = [];
  }
  return chunks;
}

function chunkToEvent(
  chunk: string[],
  block: DayBlock,
  ctx: ParseAgendaContext,
  itemIndex: number,
): ScrapedEvent | null {
  const text = chunk.join("\n");
  const time = parseTime(text);
  if (!time) return null;

  const titleLine =
    chunk.find(
      (l) => !parseTime(l) && !isCostOnlyLine(l) && l.length > 2,
    ) ?? null;
  if (!titleLine) return null;
  const title = titleLine.slice(0, 120).trim();
  if (title.length < 3) return null;

  const starts = new Date(block.date);
  starts.setHours(time.hours, time.minutes, 0, 0);
  const cost = inferCost(text);
  const address = extractAddress(text);
  const sourceUrl = cleanSourceUrl(`${ctx.postUrl}?item=${itemIndex}`);

  return {
    title,
    description: text.slice(0, 500),
    event_type: inferType(text),
    starts_at: starts.toISOString(),
    ends_at: null,
    address,
    cost_type: cost.cost_type,
    price: cost.price,
    source_url: sourceUrl,
    source_name: `Instagram @${ctx.handle}`,
    cover_url: ctx.coverUrl,
    status: "pending",
  };
}

function linesToEvents(
  block: DayBlock,
  ctx: ParseAgendaContext,
  itemOffset: number,
): ScrapedEvent[] {
  const events: ScrapedEvent[] = [];
  for (const chunk of chunkLines(block.lines)) {
    const event = chunkToEvent(
      chunk,
      block,
      ctx,
      itemOffset + events.length + 1,
    );
    if (event) events.push(event);
  }
  return events;
}

/**
 * Parse OCR (+ optional caption) from a weekly cultural flyer into event candidates.
 * Lines without a resolvable date+time are discarded.
 */
export function parseAgendaFlyerText(
  ocrText: string,
  ctx: ParseAgendaContext,
): ScrapedEvent[] {
  const now = ctx.now ?? new Date();
  const combined = [ctx.caption, ocrText].filter(Boolean).join("\n");
  const lines = combined.split("\n").map(normalizeLine).filter(Boolean);
  const blocks = splitDayBlocks(lines, now);
  if (!blocks.length) return [];

  const events: ScrapedEvent[] = [];
  for (const block of blocks) {
    events.push(...linesToEvents(block, ctx, events.length));
  }
  return events;
}
