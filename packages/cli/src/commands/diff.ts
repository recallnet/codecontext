import { resolve } from "node:path";
import { buildFileContext } from "@codecontext/parser";
import type { FileContext } from "@codecontext/parser";
import { getGitDiffLines } from "../git.js";
import { formatFileContext } from "../formatters/human.js";

/**
 * Check if a line falls within any of the changed ranges.
 */
function lineInRanges(line: number, ranges: Array<{ start: number; end: number }>): boolean {
  return ranges.some((r) => line >= r.start && line <= r.end);
}

export function runDiff(filePath: string, ref: string = "HEAD"): void {
  const absPath = resolve(filePath);
  const ranges = getGitDiffLines(absPath, ref);

  if (ranges.length === 0) {
    console.log("No changes detected — no context tags in changed lines.");
    return;
  }

  const ctx = buildFileContext(absPath);

  // Filter tags to only those in changed line ranges
  const filteredTags = ctx.tags.filter((tag) => lineInRanges(tag.location.line, ranges));

  if (filteredTags.length === 0) {
    console.log("No context tags found in changed lines.");
    return;
  }

  const filteredAnchored = ctx.anchored.filter((a) =>
    lineInRanges(a.tag.location.line, ranges),
  );

  // Collect only referenced ctx files
  const filteredCtxFiles = new Map<string, typeof ctx.resolvedCtxFiles extends Map<string, infer V> ? V : never>();
  for (const tag of filteredTags) {
    if (tag.id && ctx.resolvedCtxFiles.has(tag.id)) {
      filteredCtxFiles.set(tag.id, ctx.resolvedCtxFiles.get(tag.id)!);
    }
  }

  const filtered: FileContext = {
    file: ctx.file,
    tags: filteredTags,
    resolvedCtxFiles: filteredCtxFiles,
    anchored: filteredAnchored,
  };

  console.log(formatFileContext(filtered));
}
