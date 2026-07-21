import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildGoogleMapsDirectionsUrl,
  hasDirectionsTarget,
} from "./maps";

describe("buildGoogleMapsDirectionsUrl", () => {
  it("builds destination-only URL without origin or travelmode", () => {
    const url = buildGoogleMapsDirectionsUrl({ lat: -31.42, lng: -64.18 });
    assert.ok(url);
    const parsed = new URL(url!);
    assert.equal(parsed.origin, "https://www.google.com");
    assert.equal(parsed.pathname, "/maps/dir/");
    assert.equal(parsed.searchParams.get("api"), "1");
    assert.equal(parsed.searchParams.get("destination"), "-31.42,-64.18");
    assert.equal(parsed.searchParams.get("origin"), null);
    assert.equal(parsed.searchParams.get("travelmode"), null);
  });

  it("prefers address over coords so Maps matches the event label", () => {
    const url = buildGoogleMapsDirectionsUrl({
      lat: -31.4295,
      lng: -64.1882,
      address: "Parque Las Heras",
    });
    assert.ok(url);
    assert.equal(
      new URL(url!).searchParams.get("destination"),
      "Parque Las Heras, Córdoba",
    );
  });

  it("uses address when coords are missing", () => {
    const url = buildGoogleMapsDirectionsUrl({ address: "Paseo del Buen Pastor" });
    assert.ok(url);
    assert.equal(
      new URL(url!).searchParams.get("destination"),
      "Paseo del Buen Pastor, Córdoba",
    );
  });

  it("returns null without destination", () => {
    assert.equal(buildGoogleMapsDirectionsUrl({}), null);
  });
});

describe("hasDirectionsTarget", () => {
  it("accepts coords or address", () => {
    assert.equal(hasDirectionsTarget({ lat: 1, lng: 2 }), true);
    assert.equal(hasDirectionsTarget({ address: "Centro" }), true);
    assert.equal(hasDirectionsTarget({ address: "  " }), false);
    assert.equal(hasDirectionsTarget({}), false);
  });
});
