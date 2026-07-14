import pc from "picocolors";
import { loadCatalog, findSkill, findMcp } from "../lib/catalog.js";
import { uninstallSkill } from "../lib/skills.js";
import { uninstallMcp } from "../lib/mcps.js";
import { removeFromManifest } from "../lib/manifest.js";

export type RemoveOptions = { global?: boolean };

/** Uninstalls one package and drops it from packmanager.json. */
export function runRemove(id: string, opts: RemoveOptions): number {
  const catalog = loadCatalog();
  const skillEntry = findSkill(catalog, id);
  const isSkill = Boolean(skillEntry);
  const isMcp = Boolean(findMcp(catalog, id));

  // Uninstall works even for ids the CLI's own catalog doesn't recognize
  // (e.g. a demo id a user added to packmanager.json by hand, or a package
  // that was installable in an older catalog version) — remove whatever is
  // actually on disk rather than refusing based on the current catalog. If
  // the id isn't in the current catalog, try both install shapes (skill
  // folder and single-file command) since we can't know which it was.
  const removedSkill = skillEntry
    ? uninstallSkill(id, Boolean(opts.global), skillEntry.source.installType)
    : uninstallSkill(id, Boolean(opts.global), "skill") || uninstallSkill(id, Boolean(opts.global), "command");
  const removedMcp = uninstallMcp(id);

  if (!removedSkill && !removedMcp) {
    console.error(pc.yellow(`— ${id}: not installed, nothing to remove`));
    return 1;
  }

  if (removedSkill || isSkill) removeFromManifest(id, "skill");
  if (removedMcp || isMcp) removeFromManifest(id, "mcp");

  const kinds = [removedSkill && "skill", removedMcp && "mcp"].filter(Boolean).join(" + ");
  console.log(pc.green(`✓ ${id} removed (${kinds}) and dropped from packmanager.json`));
  return 0;
}
