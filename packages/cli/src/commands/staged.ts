import { join } from "node:path";
import { buildFileContext } from "@codecontext/parser";
import { getStagedFiles, getProjectRoot } from "../git.js";
import { formatFileContext } from "../formatters/human.js";

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

export function runStaged(): void {
  const projectRoot = getProjectRoot();
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    console.log("No staged files.");
    return;
  }

  let hasIssues = false;
  let totalStale = 0;
  let totalReview = 0;

  for (const relativePath of stagedFiles) {
    const absPath = join(projectRoot, relativePath);

    // Skip non-source files (only check files that might contain context tags)
    if (!/\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|hpp|rb|swift|kt)$/.test(relativePath)) {
      continue;
    }

    let ctx;
    try {
      ctx = buildFileContext(absPath);
    } catch {
      // Skip files that can't be parsed
      continue;
    }

    if (ctx.tags.length === 0) continue;

    const stale = ctx.anchored.filter((a) => a.status === "stale");
    const review = ctx.anchored.filter((a) => a.status === "review-required");

    if (stale.length > 0 || review.length > 0) {
      hasIssues = true;
      totalStale += stale.length;
      totalReview += review.length;

      console.log("");
      console.log(formatFileContext({
        ...ctx,
        tags: ctx.tags.filter((t) =>
          ctx.anchored.some(
            (a) =>
              a.tag.location.line === t.location.line &&
              (a.status === "stale" || a.status === "review-required"),
          ),
        ),
        anchored: [...stale, ...review],
      }));
    }
  }

  console.log("");

  if (hasIssues) {
    console.log(
      `${RED}${BOLD}Pre-commit check failed:${RESET} ${totalStale > 0 ? `${RED}${totalStale} stale${RESET}` : ""}${totalStale > 0 && totalReview > 0 ? ", " : ""}${totalReview > 0 ? `${YELLOW}${totalReview} review-required${RESET}` : ""} context entries found.`,
    );
    console.log(`${YELLOW}Review and update these context annotations before committing.${RESET}`);
    process.exit(1);
  } else {
    console.log(`${GREEN}${BOLD}All staged context entries are verified.${RESET}`);
  }
}
