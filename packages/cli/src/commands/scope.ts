import { resolve } from "node:path";

import { buildFileContext } from "@recallnet/codecontext-parser";
import type { Priority, ScopeBriefing, StalenessStatus } from "@recallnet/codecontext-parser";

import { formatScopeBriefing } from "../formatters/human.js";

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 3,
};

function priorityRank(p?: Priority): number {
  if (!p) return 2; // unset sorts between high and low
  // eslint-disable-next-line security/detect-object-injection
  return PRIORITY_ORDER[p] ?? 2;
}

export function runScope(filePath: string): void {
  const absPath = resolve(filePath);
  const ctx = buildFileContext(absPath);

  // Build a status lookup from anchored contexts
  const statusByLine = new Map<number, StalenessStatus>();
  for (const a of ctx.anchored) {
    statusByLine.set(a.tag.location.line, a.status);
  }

  // Build entries sorted by priority
  const entries = ctx.tags
    .map((tag) => {
      const ctxFile = tag.id ? ctx.resolvedCtxFiles.get(tag.id) : undefined;
      const base = {
        tag,
        status: statusByLine.get(tag.location.line) ?? ("review-required" as StalenessStatus),
      };
      return ctxFile ? { ...base, ctxFile } : base;
    })
    .sort((a, b) => priorityRank(a.tag.priority) - priorityRank(b.tag.priority));

  const briefing: ScopeBriefing = {
    file: absPath,
    entries,
  };

  // eslint-disable-next-line no-console
  console.log(formatScopeBriefing(briefing));
}
