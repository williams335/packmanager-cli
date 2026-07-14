import pc from "picocolors";
import { loadCatalog } from "../lib/catalog.js";
import { isSkillInstalled } from "../lib/skills.js";
import { isMcpInstalled } from "../lib/mcps.js";

export type StatusOptions = { global?: boolean };

/** Reports installed state purely from disk — no manifest, no network. */
export function runStatus(opts: StatusOptions): number {
  const catalog = loadCatalog();

  console.log(pc.bold("\nSkills"));
  for (const s of catalog.skills) {
    const installed = isSkillInstalled(s.id, Boolean(opts.global), s.source.installType);
    console.log(`  ${installed ? pc.green("✓ installed") : pc.dim("  not installed")}  ${s.id}`);
  }

  console.log(pc.bold("\nMCPs"));
  for (const m of catalog.mcps) {
    const installed = isMcpInstalled(m.id);
    console.log(`  ${installed ? pc.green("✓ configured") : pc.dim("  not configured")}  ${m.id}`);
  }

  console.log();
  return 0;
}
