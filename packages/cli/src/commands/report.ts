import { buildFileContext } from "@recallnet/codecontext-parser";
import type { FileContext } from "@recallnet/codecontext-parser";

import { findSourceFiles, isSourceFile } from "../files.js";
import { formatProjectReport, formatProjectReportJson } from "../formatters/report.js";
import { getChangedFilesSinceRef, getProjectRoot, validateGitRef } from "../git.js";
import { buildProjectReport } from "../report.js";

export function runReport(asJson = false, sinceRef?: string): void {
  const root = getProjectRoot();

  let sourceFiles: string[];

  if (sinceRef) {
    try {
      validateGitRef(sinceRef);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error((err as Error).message);
      process.exit(1);
    }

    try {
      sourceFiles = getChangedFilesSinceRef(sinceRef, root).filter((f) => isSourceFile(f));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error((err as Error).message);
      process.exit(1);
    }
  } else {
    sourceFiles = findSourceFiles(root);
  }

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

  const report = buildProjectReport(contexts, root, sinceRef);

  // eslint-disable-next-line no-console
  console.log(asJson ? formatProjectReportJson(report) : formatProjectReport(report));
}
