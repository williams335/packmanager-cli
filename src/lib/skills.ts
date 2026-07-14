import { mkdtempSync, rmSync, existsSync, mkdirSync, renameSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import * as tar from "tar";
import type { SkillSource } from "./catalog.js";

export class SkillInstallError extends Error {}

function skillsRoot(global: boolean): string {
  return global
    ? join(process.env.HOME || process.env.USERPROFILE || ".", ".claude", "skills")
    : join(process.cwd(), ".claude", "skills");
}

function commandsRoot(global: boolean): string {
  return global
    ? join(process.env.HOME || process.env.USERPROFILE || ".", ".claude", "commands")
    : join(process.cwd(), ".claude", "commands");
}

/**
 * Fetches a single file directly (no tarball) — for packages that ship a
 * Claude Code slash command (a lone markdown file under .claude/commands/)
 * rather than an Agent Skill folder. Real, different convention some
 * packages use (e.g. vercel-labs/web-interface-guidelines); see
 * SkillSource.installType.
 */
async function installCommand(id: string, source: SkillSource, opts: { global: boolean }): Promise<string> {
  const url = `https://raw.githubusercontent.com/${source.repo}/${source.ref}/${source.subpath}`;
  const res = await fetch(url);
  if (!res.ok) {
    throw new SkillInstallError(`source file has moved or no longer exists (${source.repo}@${source.ref}/${source.subpath}, HTTP ${res.status})`);
  }
  const content = await res.text();

  const root = commandsRoot(opts.global);
  mkdirSync(root, { recursive: true });
  const dest = join(root, `${id}.md`);
  writeFileSync(dest, content);
  return dest;
}

/**
 * Downloads `source.repo` at `source.ref` via GitHub's codeload tarball
 * endpoint (no git required), extracts only `source.subpath` (or the whole
 * repo if omitted), verifies SKILL.md exists, then moves it into place.
 * Extraction happens in a temp staging dir first so a failed/partial
 * download never corrupts an existing install.
 */
async function installSkillFolder(id: string, source: SkillSource, opts: { global: boolean }): Promise<string> {
  const url = `https://codeload.github.com/${source.repo}/tar.gz/${source.ref}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new SkillInstallError(`source repo has moved or no longer exists (${source.repo}@${source.ref}, HTTP ${res.status})`);
  }

  const staging = mkdtempSync(join(tmpdir(), `packmanager-${id}-`));
  try {
    // GitHub tarballs wrap everything in a single top-level "<repo>-<ref>/" dir.
    const repoName = source.repo.split("/")[1];
    const prefix = `${repoName}-${source.ref}/${source.subpath ? source.subpath.replace(/\/$/, "") + "/" : ""}`;

    await pipeline(
      Readable.fromWeb(res.body as import("stream/web").ReadableStream<Uint8Array>),
      tar.x({
        cwd: staging,
        strip: prefix.split("/").length - 1,
        filter: (path) => path.startsWith(prefix),
      })
    );

    if (readdirSync(staging).length === 0) {
      throw new SkillInstallError(`subpath "${source.subpath ?? "(root)"}" not found in ${source.repo}@${source.ref}`);
    }
    if (!existsSync(join(staging, "SKILL.md"))) {
      throw new SkillInstallError(`no SKILL.md found at "${source.subpath ?? "(root)"}" in ${source.repo}@${source.ref}`);
    }

    const root = skillsRoot(opts.global);
    mkdirSync(root, { recursive: true });
    const dest = join(root, id);
    rmSync(dest, { recursive: true, force: true });
    renameSync(staging, dest);
    return dest;
  } catch (err) {
    rmSync(staging, { recursive: true, force: true });
    if (err instanceof SkillInstallError) throw err;
    throw new SkillInstallError(err instanceof Error ? err.message : String(err));
  }
}

export async function installSkill(id: string, source: SkillSource, opts: { global: boolean }): Promise<string> {
  return source.installType === "command" ? installCommand(id, source, opts) : installSkillFolder(id, source, opts);
}

export function isSkillInstalled(id: string, global: boolean, installType?: "skill" | "command"): boolean {
  return installType === "command"
    ? existsSync(join(commandsRoot(global), `${id}.md`))
    : existsSync(join(skillsRoot(global), id, "SKILL.md"));
}

/** Removes an installed skill/command. No-op (returns false) if absent. */
export function uninstallSkill(id: string, global: boolean, installType?: "skill" | "command"): boolean {
  const dest = installType === "command" ? join(commandsRoot(global), `${id}.md`) : join(skillsRoot(global), id);
  if (!existsSync(dest)) return false;
  rmSync(dest, { recursive: true, force: true });
  return true;
}
