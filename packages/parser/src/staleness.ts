import { createHash } from "node:crypto";
import type { ContextTag, AnchoredContext, StalenessStatus } from "./types.js";

export interface StalenessCache {
  version: 1;
  entries: Record<string, CacheEntry>;
}

interface CacheEntry {
  blockHash: string;
  verifiedAt: string;
}

/**
 * Create an empty staleness cache.
 */
export function createEmptyCache(): StalenessCache {
  return { version: 1, entries: {} };
}

/**
 * Generate a cache key for a context tag.
 * Uses file path + tag id (or line-based fallback).
 */
function cacheKey(tag: ContextTag): string {
  const base = tag.location.file;
  if (tag.id) return `${base}:#${tag.id}`;
  return `${base}:${tag.type}:L${tag.location.line}`;
}

/**
 * Compute a content-normalized hash of a code block.
 * Strips leading/trailing whitespace from each line, collapses blank lines,
 * so minor formatting changes don't invalidate the hash.
 */
export function hashBlock(block: string): string {
  const normalized = block
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .join("\n");

  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

/**
 * Extract the logical code block that follows a @context tag.
 *
 * Strategy: Starting from the line after the tag, collect lines until
 * we hit a blank line followed by another blank line, or until we find
 * a closing brace at the same or lesser indentation as the tag line,
 * or until we hit another @context tag.
 *
 * For simple cases (tag above a single statement), this captures the
 * statement. For blocks (tag above a function), this captures until
 * the block ends.
 */
export function extractBlock(
  lines: string[],
  tagLineIndex: number,
): string {
  const blockLines: string[] = [];
  let consecutiveBlanks = 0;

  // Find the indentation level of the tag line
  const tagIndent = lines[tagLineIndex].search(/\S/);

  for (let i = tagLineIndex + 1; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Stop at another @context tag
    if (trimmed.includes("@context:")) break;

    // Track consecutive blank lines
    if (trimmed === "") {
      consecutiveBlanks++;
      if (consecutiveBlanks >= 2) break;
      blockLines.push(line);
      continue;
    }
    consecutiveBlanks = 0;

    blockLines.push(line);

    // If we see a closing brace at tag indentation or less, we've
    // reached the end of the block this tag annotates
    const lineIndent = line.search(/\S/);
    if (trimmed === "}" && lineIndent <= tagIndent) {
      break;
    }
  }

  return blockLines.join("\n");
}

/**
 * Compute staleness for all context tags in a file.
 */
export function computeStaleness(
  tags: ContextTag[],
  sourceLines: string[],
  cache: StalenessCache,
): AnchoredContext[] {
  return tags.map((tag) => {
    const key = cacheKey(tag);
    const block = extractBlock(sourceLines, tag.location.line - 1);
    const currentHash = hashBlock(block);
    const cached = cache.entries[key];

    let status: StalenessStatus;
    let verifiedAt: string | undefined;

    if (!cached) {
      // First time seeing this tag — treat as verified
      status = "verified";
    } else if (cached.blockHash === currentHash) {
      // Block hasn't changed since last verification
      status = "verified";
      verifiedAt = cached.verifiedAt;
    } else {
      // Block changed — check how long ago it was verified
      status = "stale";
      verifiedAt = cached.verifiedAt;
    }

    return { tag, blockHash: currentHash, status, verifiedAt };
  });
}

/**
 * Update the cache with current verification data.
 * Call this after a user confirms context is still accurate.
 */
export function updateCache(
  cache: StalenessCache,
  anchored: AnchoredContext[],
): StalenessCache {
  const updated = { ...cache, entries: { ...cache.entries } };
  const now = new Date().toISOString();

  for (const entry of anchored) {
    const key = cacheKey(entry.tag);
    updated.entries[key] = {
      blockHash: entry.blockHash,
      verifiedAt: now,
    };
  }

  return updated;
}
