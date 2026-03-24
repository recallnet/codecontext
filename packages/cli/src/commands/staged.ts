import { join } from "node:path";

import { buildFileContext } from "@recallnet/codecontext-parser";

import { formatFileContext } from "../formatters/human.js";
import { getStagedFiles, getProjectRoot } from "../git.js";

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|hpp|rb|swift|kt)$/;

function isSourceFile(relativePath: string): boolean {
  return SOURCE_EXTENSIONS.test(relativePath);
}

interface FileResult {
  staleCount: number;
  reviewCount: number;
  output: string | null;
}

function processFile(absPath: string): FileResult {
  let ctx;
  try {
    ctx = buildFileContext(absPath);
  } catch {
    return { staleCount: 0, reviewCount: 0, output: null };
  }

  if (ctx.tags.length === 0) {
    return { staleCount: 0, reviewCount: 0, output: null };
  }

  const stale = ctx.anchored.filter((a) => a.status === "stale");
  const review = ctx.anchored.filter((a) => a.status === "review-required");

  if (stale.length === 0 && review.length === 0) {
    return { staleCount: 0, reviewCount: 0, output: null };
  }

  const output = formatFileContext({
    ...ctx,
    tags: ctx.tags.filter((t) =>
      ctx.anchored.some(
        (a) =>
          a.tag.location.line === t.location.line &&
          (a.status === "stale" || a.status === "review-required")
      )
    ),
    anchored: [...stale, ...review],
  });

  return { staleCount: stale.length, reviewCount: review.length, output };
}

function printResults(outputs: string[], totalStale: number, totalReview: number): void {
  for (const output of outputs) {
    // eslint-disable-next-line no-console
    console.log("");
    // eslint-disable-next-line no-console
    console.log(output);
  }

  // eslint-disable-next-line no-console
  console.log("");

  if (outputs.length > 0) {
    const stalePart = totalStale > 0 ? `${RED}${String(totalStale)} stale${RESET}` : "";
    const separator = totalStale > 0 && totalReview > 0 ? ", " : "";
    const reviewPart =
      totalReview > 0 ? `${YELLOW}${String(totalReview)} review-required${RESET}` : "";
    // eslint-disable-next-line no-console
    console.log(
      `${RED}${BOLD}Pre-commit check failed:${RESET} ${stalePart}${separator}${reviewPart} context entries found.`
    );
    // eslint-disable-next-line no-console
    console.log(`${YELLOW}Review and update these context annotations before committing.${RESET}`);
    process.exit(1);
  } else {
    // eslint-disable-next-line no-console
    console.log(`${GREEN}${BOLD}All staged context entries are verified.${RESET}`);
  }
}

export function runStaged(): void {
  const projectRoot = getProjectRoot();
  const stagedFiles = getStagedFiles();

  if (stagedFiles.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No staged files.");
    return;
  }

  let totalStale = 0;
  let totalReview = 0;
  const outputs: string[] = [];

  for (const relativePath of stagedFiles) {
    if (!isSourceFile(relativePath)) {
      continue;
    }

    const absPath = join(projectRoot, relativePath);
    const result = processFile(absPath);
    totalStale += result.staleCount;
    totalReview += result.reviewCount;
    if (result.output) {
      outputs.push(result.output);
    }
  }

  printResults(outputs, totalStale, totalReview);
}
