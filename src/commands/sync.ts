import pc from "picocolors";
import { loadCatalog } from "../lib/catalog.js";
import { readManifest, manifestExists } from "../lib/manifest.js";
import { resolveRequestedIds } from "../lib/resolve.js";
import { installBatch, printOutcomes } from "../lib/batch.js";

export type SyncOptions = { global?: boolean; dryRun?: boolean; skillsOnly?: boolean; mcpsOnly?: boolean };

/**
 * Installs everything listed in packmanager.json (skills, mcps, profile,
 * minus excluded) that isn't already present. Does not remove packages
 * that are installed but no longer in the manifest — that's a separate,
 * more destructive operation `sync` intentionally doesn't do in v1 (use
 * `remove` explicitly instead).
 */
export async function runSync(opts: SyncOptions): Promise<number> {
  if (!manifestExists()) {
    console.error(pc.yellow("No packmanager.json here — nothing to sync. Run `packmanager add <id>` first, or `packmanager install` directly."));
    return 1;
  }

  const catalog = loadCatalog();
  const manifest = readManifest();

  let skillIds: string[];
  let mcpIds: string[];
  try {
    ({ skillIds, mcpIds } = resolveRequestedIds(catalog, {
      skills: manifest.skills.join(","),
      mcps: manifest.mcps.join(","),
      profile: manifest.profile,
      exclude: manifest.excluded?.join(","),
    }));
  } catch (err) {
    console.error(pc.red(`✗ ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }

  if (opts.skillsOnly) mcpIds = [];
  if (opts.mcpsOnly) skillIds = [];

  if (skillIds.length === 0 && mcpIds.length === 0) {
    console.log(pc.dim("packmanager.json is empty — nothing to sync."));
    return 0;
  }

  const outcomes = await installBatch(catalog, skillIds, mcpIds, opts);
  return printOutcomes(outcomes);
}
