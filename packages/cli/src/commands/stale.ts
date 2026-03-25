import { resolve } from "node:path";

import { buildFileContext } from "@recallnet/codecontext-parser";
import type { FileContext } from "@recallnet/codecontext-parser";

import { formatFileContext } from "../formatters/human.js";

export function runStale(filePath: string): void {
  const absPath = resolve(filePath);
  const ctx = buildFileContext(absPath);

  // Filter to only stale or review-required entries
  const staleAnchored = ctx.anchored.filter(
    (a) => a.status === "stale" || a.status === "review-required"
  );

  if (staleAnchored.length === 0) {
    // eslint-disable-next-line no-console
    console.log("All context entries are verified.");
    return;
  }

  const staleLines = new Set(staleAnchored.map((a) => a.tag.location.line));
  const staleTags = ctx.tags.filter((t) => staleLines.has(t.location.line));

  const filtered: FileContext = {
    file: ctx.file,
    tags: staleTags,
    anchored: staleAnchored,
  };

  // eslint-disable-next-line no-console
  console.log(formatFileContext(filtered));
}
