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

function sortEntries(entries: ReportEntry[]): ReportEntry[] {
  return [...entries].sort((a, b) => {
    const priorityDelta = priorityRank(a) - priorityRank(b);
    if (priorityDelta !== 0) {
      return priorityDelta;
    }

    const fileDelta = a.file.localeCompare(b.file);
    if (fileDelta !== 0) {
      return fileDelta;
    }

    return a.line - b.line;
  });
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
  const needsReview = sortEntries(
    report.entries.filter((entry) => entry.status === "stale" || entry.status === "review-required")
  );
  const decisions = sortEntries(
    report.entries.filter((entry) => entry.type === "decision" && entry.subtype !== "assumption")
  );
  const risks = sortEntries(report.entries.filter((entry) => entry.type === "risk"));
  const assumptions = sortEntries(
    report.entries.filter((entry) => entry.type === "decision" && entry.subtype === "assumption")
  );
  const history = sortEntries(report.entries.filter((entry) => entry.type === "history"));
  const other = sortEntries(
    report.entries.filter((entry) => !["decision", "risk", "history"].includes(entry.type))
  );

  const lines: string[] = [];
  lines.push(`${BOLD}${CYAN}Decision Registry${RESET} ${DIM}— ${report.root}${RESET}`);
  lines.push(
    `${DIM}${String(report.entries.length)} entries across ${String(report.filesScanned)} files | generated ${report.generatedAt}${RESET}`
  );
  lines.push("");

  lines.push(...renderSection(`Needs Review (${String(needsReview.length)})`, needsReview, report));
  lines.push(...renderSection(`Decisions (${String(decisions.length)})`, decisions, report));
  lines.push(...renderSection(`Risks (${String(risks.length)})`, risks, report));
  lines.push(...renderSection(`Assumptions (${String(assumptions.length)})`, assumptions, report));
  lines.push(...renderSection(`History (${String(history.length)})`, history, report));
  lines.push(...renderSection(`Other Context (${String(other.length)})`, other, report));

  const verified = report.entries.filter((entry) => entry.status === "verified").length;
  const referenced = report.entries.filter((entry) => entry.id).length;
  lines.push(
    `${DIM}Status summary: ${GREEN}${String(verified)} verified${RESET}${DIM}, ${RED}${String(report.entries.filter((entry) => entry.status === "stale").length)} stale${RESET}${DIM}, ${YELLOW}${String(report.entries.filter((entry) => entry.status === "review-required").length)} review-required${RESET}${DIM}.${RESET}`
  );
  lines.push(
    `${DIM}Reference summary: ${String(referenced)} linked, ${String(report.entries.length - referenced)} inline-only.${RESET}`
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
