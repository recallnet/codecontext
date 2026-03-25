import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

import { parseContextTags } from "./comment-parser.js";
import { computeStaleness, createEmptyCache } from "./staleness.js";
import type { StalenessCache } from "./staleness.js";
import type { FileContext } from "./types.js";

/**
 * Find the docs/context/ directory by walking up from the given file path.
 */
export function findContextDir(startPath: string): string | null {
  let dir = resolve(startPath);

  // Walk up to 10 levels
  for (let i = 0; i < 10; i++) {
    const candidate = join(dir, "docs", "context");
    if (existsSync(candidate)) {
      return candidate;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return null;
}

/**
 * Find the project root by walking up from the given file path.
 */
export function findProjectRoot(startPath: string): string {
  let dir = resolve(dirname(startPath));

  for (let i = 0; i < 10; i++) {
    if (
      existsSync(join(dir, ".git")) ||
      existsSync(join(dir, "package.json")) ||
      existsSync(join(dir, "go.mod"))
    ) {
      return dir;
    }
    const parent = resolve(dir, "..");
    if (parent === dir) {
      break;
    }
    dir = parent;
  }

  return resolve(dirname(startPath));
}

/**
/**
 * Load the staleness cache from the project root.
 */
export function loadCache(projectRoot: string): StalenessCache {
  const cachePath = join(projectRoot, ".codecontext-cache.json");
  if (!existsSync(cachePath)) {
    return createEmptyCache();
  }

  try {
    const content = readFileSync(cachePath, "utf-8");
    return JSON.parse(content) as StalenessCache;
  } catch {
    return createEmptyCache();
  }
}

/**
 * Persist the staleness cache at the project root.
 */
export function saveCache(projectRoot: string, cache: StalenessCache): void {
  const cachePath = join(projectRoot, ".codecontext-cache.json");
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

/**
 * Build a complete FileContext for a source file.
 */
export function buildFileContext(
  filePath: string,
  options: {
    contextDir?: string | null;
    cache?: StalenessCache;
    maxAgeDays?: number;
  } = {}
): FileContext {
  const source = readFileSync(filePath, "utf-8");
  const { tags } = parseContextTags(source, filePath);
  const projectRoot = findProjectRoot(filePath);
  const cache = options.cache ?? loadCache(projectRoot);
  const sourceLines = source.split("\n");
  const stalenessOptions =
    options.maxAgeDays === undefined ? {} : { maxAgeDays: options.maxAgeDays };
  const anchored = computeStaleness(tags, sourceLines, cache, stalenessOptions);

  return { file: filePath, tags, anchored };
}
