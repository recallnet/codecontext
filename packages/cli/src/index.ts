import { runDefault } from "./commands/default.js";
import { runDiff } from "./commands/diff.js";
import { runJson } from "./commands/json.js";
import { runReport } from "./commands/report.js";
import { runScope } from "./commands/scope.js";
import { runStaged } from "./commands/staged.js";
import { runStale } from "./commands/stale.js";

const HELP = `
Usage: codecontext [options] <filepath>

Commands:
  codecontext <filepath>              Show context annotations (human-readable)
  codecontext <filepath> --json       Show context annotations (JSON output)
  codecontext --scope <filepath>      Pre-read briefing sorted by priority
  codecontext --diff [ref] <filepath> Context for changed lines only (ref defaults to HEAD)
  codecontext --stale <filepath>      Show only stale/review-required entries
  codecontext --report                Repo-wide decision registry
  codecontext --staged                Pre-commit hook: check all staged files
  codecontext --help                  Show this help message

Options:
  --json       Output as JSON (for agent/tool consumption)
  --scope      Sort by priority, compact briefing format
  --diff       Filter to context tags in git-changed lines
  --stale      Filter to stale or review-required entries only
  --report     Scan the repo and print a project-wide report
  --staged     Check all staged files for staleness (exit 1 if issues found)
  --help, -h   Show help
`.trim();

function getFilePathForFlag(args: string[], flag: string): string {
  const idx = args.indexOf(flag);
  const filePath = args[idx + 1] ?? args.find((a: string) => !a.startsWith("--"));
  if (!filePath) {
    // eslint-disable-next-line no-console
    console.error(`Error: ${flag} requires a <filepath> argument.`);
    process.exit(1);
  }
  return filePath;
}

function handleDiff(args: string[]): void {
  const idx = args.indexOf("--diff");
  const remaining = args.filter((_: string, i: number) => i !== idx);
  const positional = remaining.filter((a: string) => !a.startsWith("--"));
  if (positional.length === 0) {
    // eslint-disable-next-line no-console
    console.error("Error: --diff requires a <filepath> argument.");
    process.exit(1);
  }
  const ref = positional.length >= 2 ? (positional[0] ?? "HEAD") : "HEAD";
  const filePath =
    positional.length >= 2 ? (positional[1] ?? positional[0] ?? "") : (positional[0] ?? "");
  runDiff(filePath, ref);
}

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    // eslint-disable-next-line no-console
    console.log(HELP);
    process.exit(0);
  }

  if (args.includes("--staged")) {
    runStaged();
    return;
  }

  if (args.includes("--report")) {
    runReport(args.includes("--json"));
    return;
  }

  if (args.includes("--scope")) {
    runScope(getFilePathForFlag(args, "--scope"));
    return;
  }

  if (args.includes("--diff")) {
    handleDiff(args);
    return;
  }

  if (args.includes("--stale")) {
    runStale(getFilePathForFlag(args, "--stale"));
    return;
  }

  // Default or --json mode
  const positional = args.filter((a: string) => !a.startsWith("--"));
  const filePath = positional[0];

  if (!filePath) {
    // eslint-disable-next-line no-console
    console.error("Error: No filepath provided. Run codecontext --help for usage.");
    process.exit(1);
  }

  if (args.includes("--json")) {
    runJson(filePath);
  } else {
    runDefault(filePath);
  }
}

main();
