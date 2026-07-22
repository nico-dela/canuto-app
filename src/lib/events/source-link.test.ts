import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { eventSourceDetailCta, eventSourceHref } from "./source-link";

const scrapedFree = {
  source: "scrape" as const,
  source_url: "https://cultura.cordoba.gob.ar/agenda/#circo",
  source_name: "Cultura Municipal",
  cost_type: "gratis" as const,
};

describe("eventSourceHref", () => {
  it("returns the scrape source URL", () => {
    assert.equal(eventSourceHref(scrapedFree), scrapedFree.source_url);
  });

  it("returns null for organizer events", () => {
    assert.equal(
      eventSourceHref({
        source: "organizer",
        source_url: "https://passline.com/x",
        source_name: "Entradas",
        cost_type: "pago",
      }),
      null,
    );
  });

  it("returns null when scrape URL is missing", () => {
    assert.equal(
      eventSourceHref({
        ...scrapedFree,
        source_url: null,
      }),
      null,
    );
  });
});

describe("eventSourceDetailCta", () => {
  it("labels free scraped events with the source name", () => {
    assert.deepEqual(eventSourceDetailCta(scrapedFree), {
      href: scrapedFree.source_url,
      label: "Más info en Cultura Municipal",
    });
  });

  it("skips CTA when paid scrape already has a ticket button on source_url", () => {
    assert.equal(
      eventSourceDetailCta({
        ...scrapedFree,
        cost_type: "pago",
      }),
      null,
    );
  });

  it("falls back when source name is missing", () => {
    assert.deepEqual(
      eventSourceDetailCta({
        ...scrapedFree,
        source_name: null,
      }),
      {
        href: scrapedFree.source_url,
        label: "Ver fuente original",
      },
    );
  });
});
