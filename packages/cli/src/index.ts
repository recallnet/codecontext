import { runDefault } from "./commands/default.js";
import { runJson } from "./commands/json.js";
import { runScope } from "./commands/scope.js";
import { runDiff } from "./commands/diff.js";
import { runStale } from "./commands/stale.js";
import { runStaged } from "./commands/staged.js";

const HELP = `
Usage: codecontext [options] <filepath>

Commands:
  codecontext <filepath>              Show context annotations (human-readable)
  codecontext <filepath> --json       Show context annotations (JSON output)
  codecontext --scope <filepath>      Pre-read briefing sorted by priority
  codecontext --diff [ref] <filepath> Context for changed lines only (ref defaults to HEAD)
  codecontext --stale <filepath>      Show only stale/review-required entries
  codecontext --staged                Pre-commit hook: check all staged files
  codecontext --help                  Show this help message

Options:
  --json       Output as JSON (for agent/tool consumption)
  --scope      Sort by priority, compact briefing format
  --diff       Filter to context tags in git-changed lines
  --stale      Filter to stale or review-required entries only
  --staged     Check all staged files for staleness (exit 1 if issues found)
  --help, -h   Show help
`.trim();

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  // --staged (no filepath needed)
  if (args.includes("--staged")) {
    runStaged();
    return;
  }

  // --scope <filepath>
  if (args.includes("--scope")) {
    const idx = args.indexOf("--scope");
    const filePath = args[idx + 1] ?? args.find((a: string) => !a.startsWith("--"));
    if (!filePath) {
      console.error("Error: --scope requires a <filepath> argument.");
      process.exit(1);
    }
    runScope(filePath);
    return;
  }

  // --diff [ref] <filepath>
  if (args.includes("--diff")) {
    const idx = args.indexOf("--diff");
    const remaining = args.filter((_: string, i: number) => i !== idx);
    // Remaining args that are not flags
    const positional = remaining.filter((a: string) => !a.startsWith("--"));
    if (positional.length === 0) {
      console.error("Error: --diff requires a <filepath> argument.");
      process.exit(1);
    }
    // If two positional args: first is ref, second is filepath
    // If one positional arg: ref defaults to HEAD, arg is filepath
    const ref = positional.length >= 2 ? positional[0] : "HEAD";
    const filePath = positional.length >= 2 ? positional[1] : positional[0];
    runDiff(filePath, ref);
    return;
  }

  // --stale <filepath>
  if (args.includes("--stale")) {
    const idx = args.indexOf("--stale");
    const filePath = args[idx + 1] ?? args.find((a: string) => !a.startsWith("--"));
    if (!filePath) {
      console.error("Error: --stale requires a <filepath> argument.");
      process.exit(1);
    }
    runStale(filePath);
    return;
  }

  // Default or --json mode
  const positional = args.filter((a: string) => !a.startsWith("--"));
  const filePath = positional[0];

  if (!filePath) {
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
