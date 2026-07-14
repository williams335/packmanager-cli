# packmanager

The real CLI behind [packmanager.dev](https://packmanager.dev) — installs curated Skills and MCPs for your AI coding agent.

```bash
npx packmanager install --skills taste-skill --mcps context7
npx packmanager install --profile developer
npx packmanager status
```

## What this does, honestly

- **Skills**: downloads the exact verified source repo/subpath from GitHub (no `git` required) and drops it into `.claude/skills/<id>/` (or `~/.claude/skills/<id>/` with `--global`).
- **MCPs**: merges a real, verified server entry into `.mcp.json` at the project root — never overwrites an existing, different entry for the same id.
- Only packages with a verified `source` in the catalog are installable. Everything else in the wider packmanager.dev catalog is still demo/unverified and will fail loudly rather than pretend to succeed — see `catalog/catalog.json`'s coverage vs. the web repo's `src/lib/registry.ts`.

## Development

```bash
npm install
npm run build      # tsup -> dist/cli.js
npm link           # exposes `packmanager` globally for local testing
npm run typecheck
npm test
```

## Catalog

`catalog/catalog.json` is vendored from the [Packmanager web repo](../Packmanager)'s `npm run export:catalog` — copy it over manually and bump the version whenever the web repo's verified real packages change. This is a deliberate manual seam (see that repo's `docs/ARCHITECTURE.md`, "repos séparés" decision) — no shared code or live API between the two repos yet.

## Commands (v1)

- `install [--skills a,b] [--mcps c,d] [--profile id] [--exclude x,y] [--global] [--dry-run]`
- `status [--global]`
- `add <id> [--global]` — installs one package and records it in `packmanager.json`
- `remove <id> [--global]` — uninstalls one package and drops it from `packmanager.json`
- `sync [--global] [--dry-run] [--skills-only] [--mcps-only]` — installs everything listed in `packmanager.json` (skills, mcps, profile, minus excluded) that isn't already present. Does **not** remove packages that are installed but no longer listed — use `remove` explicitly for that.
- `update [--skills a,b] [--mcps c,d] [--profile id] [--exclude x,y] [--global] [--dry-run] [--skills-only] [--mcps-only]` — re-fetches and reinstalls packages. With no target flags, updates everything currently installed (scanned from disk). Unlike `install`, overwrites an existing MCP entry even if it differs from the catalog — refreshing to the latest known config is the point.

v1 has no installed-version metadata, so `update` always re-fetches rather than skipping packages that are already current — meaningful once `catalog.json` itself gets refreshed pinned refs at release time.
