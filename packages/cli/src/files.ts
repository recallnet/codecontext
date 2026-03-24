import { readdirSync } from "node:fs";
import { join } from "node:path";

const IGNORED_DIRS = new Set([".git", ".turbo", "coverage", "dist", "node_modules"]);

const SOURCE_EXTENSIONS = /\.(ts|tsx|js|jsx|py|rs|go|java|c|cpp|h|hpp|rb|swift|kt)$/;

export function isSourceFile(relativePath: string): boolean {
  return SOURCE_EXTENSIONS.test(relativePath);
}

export function findSourceFiles(rootDir: string, currentDir = rootDir): string[] {
  const entries = readdirSync(currentDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const absPath = join(currentDir, entry.name);
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...findSourceFiles(rootDir, absPath));
      continue;
    }

    const relativePath = absPath.slice(rootDir.length + 1);
    if (isSourceFile(relativePath)) {
      files.push(absPath);
    }
  }

  return files.sort();
}
