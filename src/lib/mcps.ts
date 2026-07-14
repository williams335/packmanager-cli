import { existsSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { join } from "node:path";
import type { McpSource } from "./catalog.js";

export class McpInstallError extends Error {}

type McpServerEntry = {
  command?: string;
  args?: string[];
  url?: string;
  env?: Record<string, string>;
};

type McpConfig = {
  mcpServers: Record<string, McpServerEntry>;
};

function mcpConfigPath(): string {
  return join(process.cwd(), ".mcp.json");
}

function readConfig(): McpConfig {
  const path = mcpConfigPath();
  if (!existsSync(path)) return { mcpServers: {} };
  const raw = readFileSync(path, "utf8");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new McpInstallError(".mcp.json exists but isn't valid JSON — fix or remove it before installing MCPs");
  }
  const obj = parsed as Partial<McpConfig>;
  return { mcpServers: obj.mcpServers ?? {} };
}

function sourceToEntry(source: McpSource): McpServerEntry {
  if (source.transport === "stdio") {
    return { command: source.command, args: source.args, env: source.env };
  }
  return { url: source.url, env: source.env };
}

function entriesEqual(a: McpServerEntry, b: McpServerEntry): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Merges `id` -> `source` into .mcp.json at the project root. Never
 * overwrites an existing, different entry for the same id unless `force`
 * is set (returns "skipped" instead) — a user's own edits are never
 * silently clobbered by a plain `install`. `update` passes `force: true`
 * deliberately, since refreshing to the latest known-good config is the
 * whole point of that command. Writes atomically (tmp file + rename).
 */
export function installMcp(
  id: string,
  source: McpSource,
  opts: { force?: boolean } = {}
): "installed" | "already-present" | "skipped" {
  const config = readConfig();
  const entry = sourceToEntry(source);
  const existing = config.mcpServers[id];

  if (existing) {
    if (entriesEqual(existing, entry)) return "already-present";
    if (!opts.force) return "skipped";
  }

  config.mcpServers[id] = entry;
  const path = mcpConfigPath();
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(config, null, 2) + "\n");
  renameSync(tmpPath, path);
  return "installed";
}

export function isMcpInstalled(id: string): boolean {
  if (!existsSync(mcpConfigPath())) return false;
  const config = readConfig();
  return Boolean(config.mcpServers[id]);
}

/** Removes an id's entry from .mcp.json. No-op (returns false) if absent. */
export function uninstallMcp(id: string): boolean {
  if (!existsSync(mcpConfigPath())) return false;
  const config = readConfig();
  if (!config.mcpServers[id]) return false;
  delete config.mcpServers[id];
  const path = mcpConfigPath();
  const tmpPath = `${path}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(config, null, 2) + "\n");
  renameSync(tmpPath, path);
  return true;
}
