import { execSync } from "node:child_process";
import { resolve } from "node:path";

export interface LineRange {
  start: number;
  end: number;
}

/**
 * Get the git project root directory.
 */
export function getProjectRoot(): string {
  return execSync("git rev-parse --show-toplevel", { encoding: "utf-8" }).trim();
}

/**
 * Get changed line ranges from git diff for a specific file.
 * Returns ranges of lines that were added or modified.
 */
export function getGitDiffLines(filePath: string, ref = "HEAD"): LineRange[] {
  const absPath = resolve(filePath);
  const ranges: LineRange[] = [];

  let output: string;
  try {
    output = execSync(`git diff -U0 ${ref} -- "${absPath}"`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    // If diff fails (e.g., new file not yet committed), treat entire file as changed
    return [{ start: 1, end: Infinity }];
  }

  if (!output.trim()) {
    return [];
  }

  // Parse unified diff hunk headers: @@ -old,count +new,count @@
  // eslint-disable-next-line security/detect-unsafe-regex
  const hunkRegex = /^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,(\d+))?\s+@@/gm;
  let match: RegExpExecArray | null;

  while ((match = hunkRegex.exec(output)) !== null) {
    const start = parseInt(match[1] ?? "0", 10);
    const count = match[2] !== undefined ? parseInt(match[2], 10) : 1;
    if (count > 0) {
      ranges.push({ start, end: start + count - 1 });
    }
  }

  return ranges;
}

/**
 * Get list of files changed since a git ref.
 * Returns absolute paths filtered to source files that still exist on disk.
 */
export function getChangedFilesSinceRef(ref: string, root: string): string[] {
  let output: string;
  try {
    output = execSync(`git diff --name-only --diff-filter=ACMR ${ref}`, {
      encoding: "utf-8",
      cwd: root,
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Failed to resolve git ref: ${ref}`);
  }

  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0)
    .map((rel) => resolve(root, rel));
}

/**
 * Validate that a git ref can be resolved.
 */
export function validateGitRef(ref: string): void {
  try {
    execSync(`git rev-parse --verify ${ref}`, {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "pipe"],
    });
  } catch {
    throw new Error(`Invalid git ref: ${ref}`);
  }
}

/**
 * Get list of staged files (for pre-commit hook usage).
 */
export function getStagedFiles(): string[] {
  const output = execSync("git diff --cached --name-only --diff-filter=ACMR", {
    encoding: "utf-8",
  });

  return output
    .trim()
    .split("\n")
    .filter((line) => line.length > 0);
}
