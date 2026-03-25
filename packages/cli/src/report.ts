import type { FileContext, Priority, StalenessStatus } from "@recallnet/codecontext-parser";

type ReportTag = FileContext["tags"][number] & { verified?: string };
type ReportAnchored = FileContext["anchored"][number] & { reason?: string };

export interface ReportEntry {
  file: string;
  line: number;
  type: string;
  subtype?: string;
  id?: string;
  priority?: Priority;
  verified?: string;
  status: StalenessStatus;
  reason?: string;
  summary: string;
}

export interface ProjectReport {
  root: string;
  generatedAt: string;
  filesScanned: number;
  entries: ReportEntry[];
}

function buildReportEntry(
  ctx: FileContext,
  tag: FileContext["tags"][number],
  status: StalenessStatus,
  anchored?: ReportAnchored
): ReportEntry {
  const reportTag = tag as ReportTag;
  const entry: ReportEntry = {
    file: ctx.file,
    line: tag.location.line,
    type: tag.type,
    status,
    summary: tag.summary,
  };

  if (tag.subtype) {
    entry.subtype = tag.subtype;
  }
  if (tag.id) {
    entry.id = tag.id;
  }
  if (tag.priority) {
    entry.priority = tag.priority;
  }
  if (reportTag.verified) {
    entry.verified = reportTag.verified;
  }
  if (anchored?.reason) {
    entry.reason = anchored.reason;
  }

  return entry;
}

export function buildProjectReport(contexts: FileContext[], root: string): ProjectReport {
  const entries: ReportEntry[] = [];

  for (const ctx of contexts) {
    const statusByLine = new Map<number, StalenessStatus>();
    for (const anchored of ctx.anchored) {
      statusByLine.set(anchored.tag.location.line, anchored.status);
    }

    for (const tag of ctx.tags) {
      const anchored = ctx.anchored.find(
        (entry) => entry.tag.location.line === tag.location.line
      ) as ReportAnchored | undefined;
      entries.push(
        buildReportEntry(
          ctx,
          tag,
          statusByLine.get(tag.location.line) ?? "review-required",
          anchored
        )
      );
    }
  }

  return {
    root,
    generatedAt: new Date().toISOString(),
    filesScanned: contexts.length,
    entries,
  };
}
