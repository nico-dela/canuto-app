import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isScrapeBearerAuthorized } from "./auth";

describe("isScrapeBearerAuthorized", () => {
  it("accepts matching SCRAPE_SECRET", () => {
    assert.equal(
      isScrapeBearerAuthorized("Bearer secret-a", ["secret-a", undefined]),
      true,
    );
  });

  it("accepts CRON_SECRET when SCRAPE_SECRET differs", () => {
    assert.equal(
      isScrapeBearerAuthorized("Bearer cron-b", ["scrape-a", "cron-b"]),
      true,
    );
  });

  it("rejects missing/invalid headers", () => {
    assert.equal(isScrapeBearerAuthorized(null, ["secret"]), false);
    assert.equal(isScrapeBearerAuthorized("Basic x", ["secret"]), false);
    assert.equal(isScrapeBearerAuthorized("Bearer ", ["secret"]), false);
    assert.equal(isScrapeBearerAuthorized("Bearer wrong", ["secret"]), false);
  });
});
