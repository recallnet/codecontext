import { resolve } from "node:path";
import { buildFileContext } from "@codecontext/parser";
import type { FileContext } from "@codecontext/parser";
import { formatFileContext } from "../formatters/human.js";

export function runStale(filePath: string): void {
  const absPath = resolve(filePath);
  const ctx = buildFileContext(absPath);

  // Filter to only stale or review-required entries
  const staleAnchored = ctx.anchored.filter(
    (a) => a.status === "stale" || a.status === "review-required",
  );

  if (staleAnchored.length === 0) {
    console.log("All context entries are verified.");
    return;
  }

  const staleLines = new Set(staleAnchored.map((a) => a.tag.location.line));
  const staleTags = ctx.tags.filter((t) => staleLines.has(t.location.line));

  // Collect only referenced ctx files
  const filteredCtxFiles = new Map<string, typeof ctx.resolvedCtxFiles extends Map<string, infer V> ? V : never>();
  for (const tag of staleTags) {
    if (tag.id && ctx.resolvedCtxFiles.has(tag.id)) {
      filteredCtxFiles.set(tag.id, ctx.resolvedCtxFiles.get(tag.id)!);
    }
  }

  const filtered: FileContext = {
    file: ctx.file,
    tags: staleTags,
    resolvedCtxFiles: filteredCtxFiles,
    anchored: staleAnchored,
  };

  console.log(formatFileContext(filtered));
}
