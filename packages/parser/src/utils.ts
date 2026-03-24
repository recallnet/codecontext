import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";

import { parseContextTags } from "./comment-parser.js";
import { parseCtxFile } from "./ctx-file-parser.js";
import { computeStaleness, createEmptyCache } from "./staleness.js";
import type { StalenessCache } from "./staleness.js";
import type { ContextTag, CtxFile, FileContext } from "./types.js";

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
 * Load a .ctx.md file by ID from the context directory.
 */
export function loadCtxFileById(id: string, contextDir: string): CtxFile | null {
  const filePath = join(contextDir, `${id}.ctx.md`);
  if (!existsSync(filePath)) {
    return null;
  }

  const content = readFileSync(filePath, "utf-8");
  return parseCtxFile(content, filePath);
}

/**
 * Load all .ctx.md files from a context directory.
 */
export function loadAllCtxFiles(contextDir: string): CtxFile[] {
  if (!existsSync(contextDir)) {
    return [];
  }

  const files = readdirSync(contextDir).filter((f) => f.endsWith(".ctx.md"));
  const result: CtxFile[] = [];

  for (const file of files) {
    const filePath = join(contextDir, file);
    const content = readFileSync(filePath, "utf-8");
    try {
      result.push(parseCtxFile(content, filePath));
    } catch {
      // Skip malformed files
    }
  }

  return result;
}

/**
 * Resolve all #id references in tags to their .ctx.md files.
 */
export function resolveCtxFiles(
  tags: ContextTag[],
  contextDir: string | null
): Map<string, CtxFile> {
  const resolved = new Map<string, CtxFile>();
  if (!contextDir) {
    return resolved;
  }

  for (const tag of tags) {
    if (tag.id && !resolved.has(tag.id)) {
      const ctxFile = loadCtxFileById(tag.id, contextDir);
      if (ctxFile) {
        resolved.set(tag.id, ctxFile);
      }
    }
  }

  return resolved;
}

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
 * Build a complete FileContext for a source file.
 */
export function buildFileContext(
  filePath: string,
  options: {
    contextDir?: string | null;
    cache?: StalenessCache;
  } = {}
): FileContext {
  const source = readFileSync(filePath, "utf-8");
  const { tags } = parseContextTags(source, filePath);
  const contextDir = options.contextDir ?? findContextDir(filePath);
  const resolvedCtxFiles = resolveCtxFiles(tags, contextDir);
  const cache = options.cache ?? createEmptyCache();
  const sourceLines = source.split("\n");
  const anchored = computeStaleness(tags, sourceLines, cache);

  return { file: filePath, tags, resolvedCtxFiles, anchored };
}
