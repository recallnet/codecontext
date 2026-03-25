import { resolve } from "node:path";

import { buildFileContext } from "@recallnet/codecontext-parser";
import type { FileContext } from "@recallnet/codecontext-parser";

import { formatFileContext } from "../formatters/human.js";
import { getGitDiffLines } from "../git.js";

/**
 * Check if a line falls within any of the changed ranges.
 */
function lineInRanges(line: number, ranges: { start: number; end: number }[]): boolean {
  return ranges.some((r) => line >= r.start && line <= r.end);
}

export function runDiff(filePath: string, ref = "HEAD"): void {
  const absPath = resolve(filePath);
  const ranges = getGitDiffLines(absPath, ref);

  if (ranges.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No changes detected — no context tags in changed lines.");
    return;
  }

  const ctx = buildFileContext(absPath);

  // Filter tags to only those in changed line ranges
  const filteredTags = ctx.tags.filter((tag) => lineInRanges(tag.location.line, ranges));

  if (filteredTags.length === 0) {
    // eslint-disable-next-line no-console
    console.log("No context tags found in changed lines.");
    return;
  }

  const filteredAnchored = ctx.anchored.filter((a) => lineInRanges(a.tag.location.line, ranges));

  const filtered: FileContext = {
    file: ctx.file,
    tags: filteredTags,
    anchored: filteredAnchored,
  };

  // eslint-disable-next-line no-console
  console.log(formatFileContext(filtered));
}
