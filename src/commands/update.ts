import pc from "picocolors";
import { loadCatalog, findSkill, findMcp } from "../lib/catalog.js";
import { isSkillInstalled } from "../lib/skills.js";
import { isMcpInstalled } from "../lib/mcps.js";
import { resolveRequestedIds, type ResolveOptions } from "../lib/resolve.js";
import { installBatch, printOutcomes } from "../lib/batch.js";

export type UpdateOptions = ResolveOptions & {
  global?: boolean;
  dryRun?: boolean;
  skillsOnly?: boolean;
  mcpsOnly?: boolean;
};

/**
 * Re-fetches and reinstalls packages from the current catalog. With no
 * <id>/--skills/--mcps/--profile, targets everything already installed
 * (scanned from disk). Unlike `install`, overwrites an existing MCP entry
 * even if it differs — refreshing to the latest known-good config is the
 * point.
 *
 * v1 has no installed-version metadata on disk, so "update" can't yet skip
 * packages that are already current — it always re-fetches. That becomes
 * meaningful once the vendored catalog.json itself is refreshed with newer
 * pinned refs at release time (see the CLI README's release checklist).
 */
export async function runUpdate(id: string | undefined, opts: UpdateOptions): Promise<number> {
  const catalog = loadCatalog();

  let skillIds: string[];
  let mcpIds: string[];

  if (id) {
    const skill = findSkill(catalog, id);
    const mcp = findMcp(catalog, id);
    if (!skill && !mcp) {
      console.error(pc.red(`✗ ${id}: not found — likely a demo catalog entry, not yet available for installation`));
      return 1;
    }
    skillIds = skill ? [id] : [];
    mcpIds = mcp ? [id] : [];
  } else {
    const explicit = opts.skills || opts.mcps || opts.profile;
    if (explicit) {
      try {
        ({ skillIds, mcpIds } = resolveRequestedIds(catalog, opts));
      } catch (err) {
        console.error(pc.red(`✗ ${err instanceof Error ? err.message : String(err)}`));
        return 1;
      }
    } else {
      skillIds = catalog.skills.filter((s) => isSkillInstalled(s.id, Boolean(opts.global), s.source.installType)).map((s) => s.id);
      mcpIds = catalog.mcps.filter((m) => isMcpInstalled(m.id)).map((m) => m.id);
    }
  }

  if (opts.skillsOnly) mcpIds = [];
  if (opts.mcpsOnly) skillIds = [];

  if (skillIds.length === 0 && mcpIds.length === 0) {
    console.log(pc.dim("Nothing installed to update — pass an id, or --skills/--mcps/--profile to update specific packages."));
    return 0;
  }

  const outcomes = await installBatch(catalog, skillIds, mcpIds, { ...opts, force: true });
  return printOutcomes(outcomes);
}
