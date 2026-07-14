import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";

export class ManifestError extends Error {}

export type Manifest = {
  version: string;
  agent: string;
  skills: string[];
  mcps: string[];
  profile?: string;
  excluded?: string[];
};

function manifestPath(): string {
  return join(process.cwd(), "packmanager.json");
}

export function manifestExists(): boolean {
  return existsSync(manifestPath());
}

export function readManifest(): Manifest {
  const path = manifestPath();
  if (!existsSync(path)) {
    return { version: "1.0", agent: "claude-code", skills: [], mcps: [] };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(readFileSync(path, "utf8"));
  } catch {
    throw new ManifestError("packmanager.json exists but isn't valid JSON — fix or remove it first");
  }
  const obj = parsed as Partial<Manifest>;
  return {
    version: obj.version ?? "1.0",
    agent: obj.agent ?? "claude-code",
    skills: obj.skills ?? [],
    mcps: obj.mcps ?? [],
    profile: obj.profile,
    excluded: obj.excluded,
  };
}

export function writeManifest(manifest: Manifest): void {
  const path = manifestPath();
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(manifest, null, 2) + "\n");
  renameSync(tmpPath, path);
}

/** Adds `id` to the manifest's skills or mcps list, deduped, then saves. */
export function addToManifest(id: string, kind: "skill" | "mcp"): Manifest {
  const manifest = readManifest();
  const list = kind === "skill" ? manifest.skills : manifest.mcps;
  if (!list.includes(id)) list.push(id);
  writeManifest(manifest);
  return manifest;
}

/** Removes `id` from the manifest's skills or mcps list, then saves. */
export function removeFromManifest(id: string, kind: "skill" | "mcp"): Manifest {
  const manifest = readManifest();
  if (kind === "skill") manifest.skills = manifest.skills.filter((s) => s !== id);
  else manifest.mcps = manifest.mcps.filter((m) => m !== id);
  writeManifest(manifest);
  return manifest;
}
