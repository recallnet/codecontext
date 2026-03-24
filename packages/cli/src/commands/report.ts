import { buildFileContext } from "@recallnet/codecontext-parser";
import type { FileContext } from "@recallnet/codecontext-parser";

import { findSourceFiles } from "../files.js";
import { formatProjectReport, formatProjectReportJson } from "../formatters/report.js";
import { getProjectRoot } from "../git.js";
import { buildProjectReport } from "../report.js";

export function runReport(asJson = false): void {
  const root = getProjectRoot();
  const sourceFiles = findSourceFiles(root);
  const contexts: FileContext[] = [];

  for (const filePath of sourceFiles) {
    try {
      const ctx = buildFileContext(filePath);
      if (ctx.tags.length > 0) {
        contexts.push(ctx);
      }
    } catch {
      // Ignore unreadable or unsupported files during a repo-wide scan.
    }
  }

  const report = buildProjectReport(contexts, root);

  // eslint-disable-next-line no-console
  console.log(asJson ? formatProjectReportJson(report) : formatProjectReport(report));
}
