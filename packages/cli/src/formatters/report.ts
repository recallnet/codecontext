import { relative } from "node:path";

import type { ProjectReport, ReportEntry } from "../report.js";

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const CYAN = "\x1b[36m";

function formatLabel(entry: ReportEntry): string {
  return entry.subtype ? `${entry.type}:${entry.subtype}` : entry.type;
}

function priorityRank(entry: ReportEntry): number {
  switch (entry.priority) {
    case "critical":
      return 0;
    case "high":
      return 1;
    case "low":
      return 3;
    default:
      return 2;
  }
}

function relativeFile(report: ProjectReport, file: string): string {
  return relative(report.root, file) || file;
}

function renderSection(title: string, entries: ReportEntry[], report: ProjectReport): string[] {
  const lines: string[] = [];
  lines.push(`${BOLD}${title}${RESET}`);

  if (entries.length === 0) {
    lines.push(`${DIM}None${RESET}`);
    lines.push("");
    return lines;
  }

  for (const entry of entries) {
    const ref = entry.id ? ` #${entry.id}` : "";
    lines.push(
      `- ${BOLD}${formatLabel(entry)}${RESET}${ref} ${DIM}${relativeFile(report, entry.file)}:${String(entry.line)}${RESET}`
    );
    lines.push(`  ${entry.summary}`);
  }

  lines.push("");
  return lines;
}

export function formatProjectReport(report: ProjectReport): string {
  const critical = report.entries
    .filter((entry) => entry.priority === "critical")
    .sort((a, b) => priorityRank(a) - priorityRank(b));
  const stale = report.entries.filter(
    (entry) => entry.status === "stale" || entry.status === "review-required"
  );
  const assumptions = report.entries.filter(
    (entry) => entry.type === "decision" && entry.subtype === "assumption"
  );

  const lines: string[] = [];
  lines.push(`${BOLD}${CYAN}Decision Registry${RESET} ${DIM}— ${report.root}${RESET}`);
  lines.push(
    `${DIM}${String(report.entries.length)} entries across ${String(report.filesScanned)} files | generated ${report.generatedAt}${RESET}`
  );
  lines.push("");

  lines.push(...renderSection(`Critical Decisions (${String(critical.length)})`, critical, report));
  lines.push(
    ...renderSection(`Stale Context Requiring Review (${String(stale.length)})`, stale, report)
  );
  lines.push(...renderSection(`Assumptions (${String(assumptions.length)})`, assumptions, report));

  const verified = report.entries.filter((entry) => entry.status === "verified").length;
  lines.push(
    `${DIM}Status summary: ${GREEN}${String(verified)} verified${RESET}${DIM}, ${RED}${String(report.entries.filter((entry) => entry.status === "stale").length)} stale${RESET}${DIM}, ${YELLOW}${String(report.entries.filter((entry) => entry.status === "review-required").length)} review-required${RESET}${DIM}.${RESET}`
  );

  return lines.join("\n");
}

export function formatProjectReportJson(report: ProjectReport): string {
  return JSON.stringify(
    {
      root: report.root,
      generatedAt: report.generatedAt,
      filesScanned: report.filesScanned,
      entries: report.entries.map((entry) => ({
        file: entry.file,
        line: entry.line,
        type: entry.type,
        subtype: entry.subtype ?? null,
        id: entry.id ?? null,
        priority: entry.priority ?? null,
        status: entry.status,
        summary: entry.summary,
        ctxFile: entry.ctxFile
          ? {
              id: entry.ctxFile.frontmatter.id,
              type: entry.ctxFile.frontmatter.type,
              status: entry.ctxFile.frontmatter.status,
              verified: entry.ctxFile.frontmatter.verified,
              owners: entry.ctxFile.frontmatter.owners,
              traces: entry.ctxFile.frontmatter.traces,
              filePath: entry.ctxFile.filePath,
            }
          : null,
      })),
    },
    null,
    2
  );
}
