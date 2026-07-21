import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getInstagramMaxPosts,
  getInstagramProfiles,
  isInstagramScrapeEnabled,
} from "./config";

describe("instagram config", () => {
  it("is disabled by default", () => {
    assert.equal(isInstagramScrapeEnabled({}), false);
    assert.equal(
      isInstagramScrapeEnabled({ INSTAGRAM_SCRAPE_ENABLED: "false" }),
      false,
    );
  });

  it("enables on true/1/yes", () => {
    assert.equal(
      isInstagramScrapeEnabled({ INSTAGRAM_SCRAPE_ENABLED: "true" }),
      true,
    );
    assert.equal(
      isInstagramScrapeEnabled({ INSTAGRAM_SCRAPE_ENABLED: "1" }),
      true,
    );
    assert.equal(
      isInstagramScrapeEnabled({ INSTAGRAM_SCRAPE_ENABLED: "yes" }),
      true,
    );
  });

  it("parses profiles with @ and spaces", () => {
    assert.deepEqual(
      getInstagramProfiles({
        INSTAGRAM_PROFILES: "@culturabrava, isos_cba ",
      }),
      ["culturabrava", "isos_cba"],
    );
  });

  it("defaults profiles and clamps max posts", () => {
    assert.deepEqual(getInstagramProfiles({}), [
      "culturabrava",
      "isos_cba",
    ]);
    assert.equal(getInstagramMaxPosts({}), 6);
    assert.equal(getInstagramMaxPosts({ INSTAGRAM_MAX_POSTS: "100" }), 24);
    assert.equal(getInstagramMaxPosts({ INSTAGRAM_MAX_POSTS: "0" }), 6);
  });
});
