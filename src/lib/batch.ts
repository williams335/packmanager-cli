import pc from "picocolors";
import type { Catalog } from "./catalog.js";
import { findSkill, findMcp } from "./catalog.js";
import { installSkill, SkillInstallError } from "./skills.js";
import { installMcp, McpInstallError } from "./mcps.js";

export type Outcome = { id: string; kind: "skill" | "mcp"; status: "ok" | "skip" | "fail"; message: string };

export type BatchOptions = { global?: boolean; dryRun?: boolean; force?: boolean };

/**
 * Installs each requested skill/mcp id independently — one failure never
 * stops the rest. Shared by `install` and `sync` so both report the same
 * honest, per-package outcome format.
 */
export async function installBatch(
  catalog: Catalog,
  skillIds: string[],
  mcpIds: string[],
  opts: BatchOptions
): Promise<Outcome[]> {
  const outcomes: Outcome[] = [];

  for (const id of skillIds) {
    const entry = findSkill(catalog, id);
    if (!entry) {
      outcomes.push({ id, kind: "skill", status: "fail", message: "not found — likely a demo catalog entry, not yet available for installation" });
      continue;
    }
    if (opts.dryRun) {
      outcomes.push({ id, kind: "skill", status: "ok", message: `would install from ${entry.source.repo}` });
      continue;
    }
    try {
      const dest = await installSkill(id, entry.source, { global: Boolean(opts.global) });
      outcomes.push({ id, kind: "skill", status: "ok", message: `installed to ${dest}` });
    } catch (err) {
      const msg = err instanceof SkillInstallError ? err.message : err instanceof Error ? err.message : String(err);
      outcomes.push({ id, kind: "skill", status: "fail", message: msg });
    }
  }

  for (const id of mcpIds) {
    const entry = findMcp(catalog, id);
    if (!entry) {
      outcomes.push({ id, kind: "mcp", status: "fail", message: "not found — likely a demo catalog entry, not yet available for installation" });
      continue;
    }
    if (opts.dryRun) {
      outcomes.push({ id, kind: "mcp", status: "ok", message: "would add to .mcp.json" });
      continue;
    }
    try {
      const result = installMcp(id, entry.source, { force: opts.force });
      if (result === "skipped") {
        outcomes.push({ id, kind: "mcp", status: "skip", message: "a different entry already exists for this id in .mcp.json — not overwritten (use --force to override, not yet implemented)" });
      } else if (result === "already-present") {
        outcomes.push({ id, kind: "mcp", status: "ok", message: "already configured in .mcp.json" });
      } else {
        outcomes.push({ id, kind: "mcp", status: "ok", message: "added to .mcp.json" });
      }
    } catch (err) {
      const msg = err instanceof McpInstallError ? err.message : err instanceof Error ? err.message : String(err);
      outcomes.push({ id, kind: "mcp", status: "fail", message: msg });
    }
  }

  return outcomes;
}

export function printOutcomes(outcomes: Outcome[]): number {
  console.log();
  for (const o of outcomes) {
    const icon = o.status === "ok" ? pc.green("✓") : o.status === "skip" ? pc.yellow("—") : pc.red("✗");
    console.log(`${icon} ${pc.bold(o.id)} ${pc.dim(`(${o.kind})`)} — ${o.message}`);
  }

  const failed = outcomes.filter((o) => o.status === "fail").length;
  const skipped = outcomes.filter((o) => o.status === "skip").length;
  console.log();
  if (failed > 0 || skipped > 0) {
    console.log(pc.yellow(`${outcomes.length - failed - skipped} succeeded, ${skipped} skipped, ${failed} failed.`));
    return 1;
  }
  console.log(pc.green(`All ${outcomes.length} package(s) installed.`));
  return 0;
}
