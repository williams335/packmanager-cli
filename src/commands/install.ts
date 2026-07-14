import pc from "picocolors";
import { loadCatalog } from "../lib/catalog.js";
import { resolveRequestedIds, type ResolveOptions } from "../lib/resolve.js";
import { installBatch, printOutcomes } from "../lib/batch.js";
import { readManifest, writeManifest } from "../lib/manifest.js";

export type InstallOptions = ResolveOptions & {
  global?: boolean;
  dryRun?: boolean;
};

export async function runInstall(opts: InstallOptions): Promise<number> {
  const catalog = loadCatalog();

  let skillIds: string[];
  let mcpIds: string[];
  try {
    ({ skillIds, mcpIds } = resolveRequestedIds(catalog, opts));
  } catch (err) {
    console.error(pc.red(`✗ ${err instanceof Error ? err.message : String(err)}`));
    return 1;
  }

  if (skillIds.length === 0 && mcpIds.length === 0) {
    console.error(pc.yellow("Nothing to install — pass --skills, --mcps or --profile."));
    return 1;
  }

  const outcomes = await installBatch(catalog, skillIds, mcpIds, opts);
  const exitCode = printOutcomes(outcomes);

  // Record every successfully installed package in packmanager.json — was
  // previously only done by `add`, so a plain `install` never produced the
  // lockfile the docs (and `sync`) both assume exists. Dry runs never touch
  // the manifest, matching their "nothing is written" contract.
  if (!opts.dryRun) {
    const succeeded = outcomes.filter((o) => o.status === "ok");
    if (succeeded.length > 0) {
      const manifest = readManifest();
      for (const o of succeeded) {
        const list = o.kind === "skill" ? manifest.skills : manifest.mcps;
        if (!list.includes(o.id)) list.push(o.id);
      }
      if (opts.profile) manifest.profile = opts.profile;
      writeManifest(manifest);
    }
  }

  return exitCode;
}
