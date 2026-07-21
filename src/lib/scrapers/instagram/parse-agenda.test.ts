import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseAgendaFlyerText,
  parseDayHeader,
  parseTime,
} from "./parse-agenda";

const CTX = {
  handle: "culturabrava",
  postUrl: "https://www.instagram.com/culturabrava/p/Abc123/",
  coverUrl: "https://example.com/flyer.jpg",
};

describe("parseTime", () => {
  it("parses hs and HH:MM", () => {
    assert.deepEqual(parseTime("21hs"), { hours: 21, minutes: 0 });
    assert.deepEqual(parseTime("20:30"), { hours: 20, minutes: 30 });
    assert.deepEqual(parseTime("a las 19 h"), { hours: 19, minutes: 0 });
  });

  it("ignores bare day numbers", () => {
    assert.equal(parseTime("lunes 14"), null);
    assert.equal(parseTime("Show en sala 2"), null);
  });
});

describe("parseDayHeader", () => {
  it("resolves weekday + day of month from anchor", () => {
    // Monday 2026-07-20
    const now = new Date(2026, 6, 20, 12, 0);
    const d = parseDayHeader("LUNES 20", now);
    assert.ok(d);
    assert.equal(d!.getDay(), 1);
    assert.equal(d!.getDate(), 20);
  });

  it("parses day with month name", () => {
    const now = new Date(2026, 6, 1, 12, 0);
    const d = parseDayHeader("viernes 24 de julio", now);
    assert.ok(d);
    assert.equal(d!.getMonth(), 6);
    assert.equal(d!.getDate(), 24);
  });
});

describe("parseAgendaFlyerText", () => {
  it("extracts multiple weekday events with cost and venue", () => {
    const ocr = `
AGENDA SEMANAL
LUNES 20
Show de jazz en Parque Las Heras
21hs
Gratis

MARTES 21
Obra de teatro en el Cabildo
20:30
$5000
`;
    const now = new Date(2026, 6, 20, 10, 0);
    const events = parseAgendaFlyerText(ocr, { ...CTX, now });
    assert.equal(events.length, 2);

    assert.equal(events[0].title, "Show de jazz en Parque Las Heras");
    assert.equal(events[0].status, "pending");
    assert.equal(events[0].cost_type, "gratis");
    assert.equal(events[0].event_type, "musica");
    assert.ok(events[0].address?.toLowerCase().includes("parque las heras"));
    assert.ok(events[0].source_url.includes("item=1"));
    assert.equal(events[0].source_name, "Instagram @culturabrava");
    assert.equal(new Date(events[0].starts_at).getHours(), 21);

    assert.equal(events[1].title, "Obra de teatro en el Cabildo");
    assert.equal(events[1].cost_type, "pago");
    assert.equal(events[1].price, 5000);
    assert.equal(events[1].event_type, "teatro");
    assert.ok(events[1].source_url.includes("item=2"));
  });

  it("discards lines without time", () => {
    const ocr = `
LUNES 20
Solo un título sin horario
MARTES 21
Otro sin hora
`;
    const now = new Date(2026, 6, 20, 10, 0);
    const events = parseAgendaFlyerText(ocr, { ...CTX, now });
    assert.equal(events.length, 0);
  });

  it("uses caption day headers when OCR lacks them", () => {
    const caption = "Agenda lunes 20 y martes 21";
    const ocr = `
LUNES 20
Feria de diseño
18hs
a la gorra
`;
    const now = new Date(2026, 6, 20, 10, 0);
    const events = parseAgendaFlyerText(ocr, {
      ...CTX,
      caption,
      now,
    });
    assert.equal(events.length, 1);
    assert.equal(events[0].cost_type, "a_la_gorra");
    assert.equal(events[0].event_type, "feria");
  });

  it("returns empty when there are no day blocks", () => {
    const events = parseAgendaFlyerText("hola mundo sin fechas", {
      ...CTX,
      now: new Date(2026, 6, 20),
    });
    assert.equal(events.length, 0);
  });
});
