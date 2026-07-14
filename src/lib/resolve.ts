import type { Catalog } from "./catalog.js";

export type ResolveOptions = {
  skills?: string;
  mcps?: string;
  profile?: string;
  exclude?: string;
};

function csv(value?: string): string[] {
  return value ? value.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

/**
 * Merges --skills/--mcps/--profile into one deduped id list per type,
 * applying --exclude last. Does not check installability — that happens
 * per-id in the install command so each failure is reported individually.
 */
export function resolveRequestedIds(
  catalog: Catalog,
  opts: ResolveOptions
): { skillIds: string[]; mcpIds: string[] } {
  const excluded = new Set(csv(opts.exclude));
  const skillIds = new Set(csv(opts.skills));
  const mcpIds = new Set(csv(opts.mcps));

  if (opts.profile) {
    const profile = catalog.profiles.find((p) => p.id === opts.profile);
    if (!profile) {
      throw new Error(`unknown profile "${opts.profile}" — see packmanager.dev/profiles`);
    }
    for (const id of profile.skills) skillIds.add(id);
    for (const id of profile.mcps) mcpIds.add(id);
  }

  for (const id of excluded) {
    skillIds.delete(id);
    mcpIds.delete(id);
  }

  return { skillIds: [...skillIds], mcpIds: [...mcpIds] };
}
