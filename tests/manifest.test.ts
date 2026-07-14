import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addToManifest, removeFromManifest, readManifest } from "../src/lib/manifest.js";

describe("manifest add/remove", () => {
  let dir: string;
  let originalCwd: string;

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "packmanager-manifest-"));
    originalCwd = process.cwd();
    process.chdir(dir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    rmSync(dir, { recursive: true, force: true });
  });

  it("creates packmanager.json on first add and dedupes", () => {
    addToManifest("taste-skill", "skill");
    addToManifest("taste-skill", "skill");
    const manifest = readManifest();
    expect(manifest.skills).toEqual(["taste-skill"]);
  });

  it("adds skills and mcps independently", () => {
    addToManifest("taste-skill", "skill");
    addToManifest("context7", "mcp");
    const manifest = readManifest();
    expect(manifest.skills).toEqual(["taste-skill"]);
    expect(manifest.mcps).toEqual(["context7"]);
  });

  it("removes only the requested id", () => {
    addToManifest("taste-skill", "skill");
    addToManifest("archify", "skill");
    removeFromManifest("taste-skill", "skill");
    const manifest = readManifest();
    expect(manifest.skills).toEqual(["archify"]);
  });
});
