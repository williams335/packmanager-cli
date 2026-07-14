import pc from "picocolors";
import { loadCatalog, findSkill, findMcp } from "../lib/catalog.js";
import { installSkill, SkillInstallError } from "../lib/skills.js";
import { installMcp, McpInstallError } from "../lib/mcps.js";
import { addToManifest } from "../lib/manifest.js";

export type AddOptions = { global?: boolean };

/** Installs one package and records it in packmanager.json. */
export async function runAdd(id: string, opts: AddOptions): Promise<number> {
  const catalog = loadCatalog();
  const skill = findSkill(catalog, id);
  const mcp = findMcp(catalog, id);

  if (!skill && !mcp) {
    console.error(pc.red(`✗ ${id}: not found — likely a demo catalog entry, not yet available for installation`));
    return 1;
  }

  try {
    if (skill) {
      const dest = await installSkill(id, skill.source, { global: Boolean(opts.global) });
      addToManifest(id, "skill");
      console.log(pc.green(`✓ ${id} installed to ${dest} and added to packmanager.json`));
    } else if (mcp) {
      installMcp(id, mcp.source);
      addToManifest(id, "mcp");
      console.log(pc.green(`✓ ${id} added to .mcp.json and packmanager.json`));
    }
    return 0;
  } catch (err) {
    const msg = err instanceof SkillInstallError || err instanceof McpInstallError ? err.message : err instanceof Error ? err.message : String(err);
    console.error(pc.red(`✗ ${id}: ${msg}`));
    return 1;
  }
}
