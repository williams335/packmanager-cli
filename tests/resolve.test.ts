import { describe, it, expect } from "vitest";
import { resolveRequestedIds } from "../src/lib/resolve.js";
import type { Catalog } from "../src/lib/catalog.js";

const catalog: Catalog = {
  generatedAt: "2026-07-14",
  skills: [],
  mcps: [],
  profiles: [
    { id: "developer", label: "--profile developer", skills: ["code-review", "webapp-testing"], mcps: ["github", "context7"] },
  ],
};

describe("resolveRequestedIds", () => {
  it("merges --skills/--mcps flags directly", () => {
    const { skillIds, mcpIds } = resolveRequestedIds(catalog, { skills: "a,b", mcps: "c" });
    expect(skillIds).toEqual(["a", "b"]);
    expect(mcpIds).toEqual(["c"]);
  });

  it("expands a profile and merges with explicit flags, deduped", () => {
    const { skillIds, mcpIds } = resolveRequestedIds(catalog, { skills: "webapp-testing", profile: "developer" });
    expect(skillIds.sort()).toEqual(["code-review", "webapp-testing"]);
    expect(mcpIds.sort()).toEqual(["context7", "github"]);
  });

  it("applies --exclude after everything else", () => {
    const { skillIds } = resolveRequestedIds(catalog, { profile: "developer", exclude: "code-review" });
    expect(skillIds).toEqual(["webapp-testing"]);
  });

  it("throws on an unknown profile", () => {
    expect(() => resolveRequestedIds(catalog, { profile: "nope" })).toThrow(/unknown profile/);
  });
});
