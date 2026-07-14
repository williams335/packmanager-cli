import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export type SkillSource = {
  repo: string;
  ref: string;
  subpath?: string;
  /** "skill" (default): folder with SKILL.md -> .claude/skills/<id>/.
   *  "command": single markdown file -> .claude/commands/<id>.md. */
  installType?: "skill" | "command";
};

export type McpSource =
  | {
      transport: "stdio";
      runtime: "npx" | "uvx";
      command: string;
      args: string[];
      env?: Record<string, string>;
    }
  | {
      transport: "sse" | "http";
      url: string;
      env?: Record<string, string>;
    };

export type CatalogSkill = {
  id: string;
  type: "skill";
  desc: string;
  v: string;
  agents: string[];
  source: SkillSource;
};

export type CatalogMcp = {
  id: string;
  type: "mcp";
  desc: string;
  v: string;
  agents: string[];
  auth: string;
  source: McpSource;
};

export type CatalogProfile = {
  id: string;
  label: string;
  skills: string[];
  mcps: string[];
};

export type Catalog = {
  generatedAt: string;
  skills: CatalogSkill[];
  mcps: CatalogMcp[];
  profiles: CatalogProfile[];
};

let cached: Catalog | null = null;

/** Loads the vendored catalog.json shipped alongside this CLI's dist/. */
export function loadCatalog(): Catalog {
  if (cached) return cached;
  const here = dirname(fileURLToPath(import.meta.url));
  // dist/cli.mjs sits next to ../catalog/catalog.json in the published package.
  const path = join(here, "..", "catalog", "catalog.json");
  const raw = readFileSync(path, "utf8");
  cached = JSON.parse(raw) as Catalog;
  return cached;
}

export function findSkill(catalog: Catalog, id: string): CatalogSkill | undefined {
  return catalog.skills.find((s) => s.id === id);
}

export function findMcp(catalog: Catalog, id: string): CatalogMcp | undefined {
  return catalog.mcps.find((m) => m.id === id);
}
