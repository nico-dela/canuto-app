import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { guessCoords } from "./normalize";

describe("guessCoords", () => {
  it("resolves Parque Las Heras to the park, not Nueva Córdoba", () => {
    const coords = guessCoords("Parque Las Heras");
    assert.equal(coords.lat, -31.4056);
    assert.equal(coords.lng, -64.1848);
  });
});
