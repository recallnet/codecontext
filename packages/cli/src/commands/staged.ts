import { writeFileSync } from "node:fs";
import { join } from "node:path";

import {
  buildFileContext,
  loadCache,
  updateCache,
  type StalenessCache,
} from "@recallnet/codecontext-parser";

import { isSourceFile } from "../files.js";
import { formatFileContext } from "../formatters/human.js";
import { getStagedFiles, getProjectRoot } from "../git.js";

const BOLD = "\x1b[1m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RESET = "\x1b[0m";

interface FileResult {
  staleCount: number;
  reviewCount: number;
  output: string | null;
  cache: StalenessCache;
}

function persistCache(projectRoot: string, cache: StalenessCache): void {
  writeFileSync(
    join(projectRoot, ".codecontext-cache.json"),
    JSON.stringify(cache, null, 2),
    "utf-8"
  );
}

function processFile(absPath: string, cache: StalenessCache): FileResult {
  let ctx;
  try {
    ctx = buildFileContext(absPath, { cache });
  } catch {
    return { staleCount: 0, reviewCount: 0, output: null, cache };
  }

  if (ctx.tags.length === 0) {
    return { staleCount: 0, reviewCount: 0, output: null, cache };
  }

  const stale = ctx.anchored.filter((a) => a.status === "stale");
  const review = ctx.anchored.filter((a) => a.status === "review-required");

  if (stale.length === 0 && review.length === 0) {
    return {
      staleCount: 0,
      reviewCount: 0,
      output: null,
      cache: updateCache(cache, ctx.anchored),
    };
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

  return { staleCount: stale.length, reviewCount: review.length, output, cache };
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
  let cache = loadCache(projectRoot);

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
    const result = processFile(absPath, cache);
    totalStale += result.staleCount;
    totalReview += result.reviewCount;
    cache = result.cache;
    if (result.output) {
      outputs.push(result.output);
    }
  }

  if (outputs.length === 0) {
    persistCache(projectRoot, cache);
  }

  printResults(outputs, totalStale, totalReview);
}
