import { Command } from "commander";
import { runInstall } from "./commands/install.js";
import { runStatus } from "./commands/status.js";
import { runAdd } from "./commands/add.js";
import { runRemove } from "./commands/remove.js";
import { runSync } from "./commands/sync.js";
import { runUpdate } from "./commands/update.js";

const program = new Command();

program
  .name("packmanager")
  .description("Install real, curated Skills and MCPs for your AI coding agent.")
  .version("0.1.0");

program
  .command("install")
  .description("Install Skills and/or MCPs")
  .option("--skills <ids>", "comma-separated Skill ids")
  .option("--mcps <ids>", "comma-separated MCP ids")
  .option("--profile <id>", "install every package in a profile")
  .option("--exclude <ids>", "comma-separated ids to exclude")
  .option("--global", "install Skills to ~/.claude/skills instead of ./.claude/skills")
  .option("--dry-run", "classify what would happen without touching disk")
  .action(async (options) => {
    const code = await runInstall(options);
    process.exitCode = code;
  });

program
  .command("status")
  .description("Show which catalog packages are installed, read from disk")
  .option("--global", "check ~/.claude/skills instead of ./.claude/skills")
  .action((options) => {
    process.exitCode = runStatus(options);
  });

program
  .command("add <id>")
  .description("Install one package and record it in packmanager.json")
  .option("--global", "install Skills to ~/.claude/skills instead of ./.claude/skills")
  .action(async (id, options) => {
    process.exitCode = await runAdd(id, options);
  });

program
  .command("remove <id>")
  .description("Uninstall one package and drop it from packmanager.json")
  .option("--global", "check ~/.claude/skills instead of ./.claude/skills")
  .action((id, options) => {
    process.exitCode = runRemove(id, options);
  });

program
  .command("sync")
  .description("Install everything listed in packmanager.json that isn't already present")
  .option("--global", "install Skills to ~/.claude/skills instead of ./.claude/skills")
  .option("--dry-run", "classify what would happen without touching disk")
  .option("--skills-only", "only sync skills")
  .option("--mcps-only", "only sync MCPs")
  .action(async (options) => {
    process.exitCode = await runSync(options);
  });

program
  .command("update [id]")
  .description("Re-fetch and reinstall packages — everything installed by default, one package if <id> is given, or a specific set via flags")
  .option("--skills <ids>", "comma-separated Skill ids")
  .option("--mcps <ids>", "comma-separated MCP ids")
  .option("--profile <id>", "update every package in a profile")
  .option("--exclude <ids>", "comma-separated ids to exclude")
  .option("--global", "check ~/.claude/skills instead of ./.claude/skills")
  .option("--dry-run", "classify what would happen without touching disk")
  .option("--skills-only", "only update skills")
  .option("--mcps-only", "only update MCPs")
  .action(async (id, options) => {
    process.exitCode = await runUpdate(id, options);
  });

program.parseAsync(process.argv);
