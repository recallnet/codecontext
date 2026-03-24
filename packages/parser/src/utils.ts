import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

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
 * Load a structured .ctx.md file by direct project-relative path reference.
 */
export function loadCtxFileByRef(ref: string, projectRoot: string): CtxFile | null {
  if (!ref.endsWith(".ctx.md")) {
    return null;
  }

  const filePath = join(projectRoot, ref);
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
  contextDir: string | null,
  projectRoot: string
): Map<string, CtxFile> {
  const resolved = new Map<string, CtxFile>();

  for (const tag of tags) {
    if (tag.id && !resolved.has(tag.id)) {
      const ctxFile =
        loadCtxFileByRef(tag.id, projectRoot) ??
        (contextDir ? loadCtxFileById(tag.id, contextDir) : null);
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
 * Persist the staleness cache at the project root.
 */
export function saveCache(projectRoot: string, cache: StalenessCache): void {
  const cachePath = join(projectRoot, ".codecontext-cache.json");
  writeFileSync(cachePath, JSON.stringify(cache, null, 2), "utf-8");
}

function normalizeVerifiedDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  return value.slice(0, 10);
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
  const contextDir = options.contextDir ?? findContextDir(filePath);
  const projectRoot = findProjectRoot(filePath);
  const resolvedCtxFiles = resolveCtxFiles(tags, contextDir, projectRoot);
  const cache = options.cache ?? loadCache(projectRoot);
  const effectiveTags = tags.map((tag) => {
    const resolved = tag.id ? resolvedCtxFiles.get(tag.id) : undefined;
    if (tag.verified || !resolved) {
      return tag;
    }

    const verified = normalizeVerifiedDate(resolved.frontmatter.verified);
    if (!verified) {
      return tag;
    }

    return {
      ...tag,
      verified,
    };
  });
  const sourceLines = source.split("\n");
  const stalenessOptions =
    options.maxAgeDays === undefined ? {} : { maxAgeDays: options.maxAgeDays };
  const anchored = computeStaleness(effectiveTags, sourceLines, cache, stalenessOptions);

  return { file: filePath, tags: effectiveTags, resolvedCtxFiles, anchored };
}
