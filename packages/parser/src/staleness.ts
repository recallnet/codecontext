import { createHash } from "node:crypto";

import { isContextTagCandidate, stripCommentDelimiters } from "./comment-parser.js";
import type { AnchoredContext, ContextTag } from "./types.js";

export interface StalenessCache {
  version: 1;
  entries: Record<string, CacheEntry>;
}

interface CacheEntry {
  blockHash: string;
  verifiedAt: string;
  verifiedDate?: string;
}

export interface StalenessOptions {
  maxAgeDays?: number;
  now?: Date;
}

/**
 * Create an empty staleness cache.
 */
export function createEmptyCache(): StalenessCache {
  return { version: 1, entries: {} };
}

function ageInDays(verifiedDate: string, now: Date): number {
  const verifiedAt = new Date(`${verifiedDate}T00:00:00.000Z`);
  return Math.floor((now.getTime() - verifiedAt.getTime()) / (1000 * 60 * 60 * 24));
}

function isExpired(verifiedDate: string | undefined, maxAgeDays: number, now: Date): boolean {
  if (!verifiedDate) {
    return false;
  }

  return ageInDays(verifiedDate, now) > maxAgeDays;
}

function withOptionalContext(
  base: AnchoredContext,
  options: { verifiedAt?: string; verifiedDate?: string }
): AnchoredContext {
  const result: AnchoredContext = { ...base };

  if (options.verifiedAt) {
    result.verifiedAt = options.verifiedAt;
  }
  if (options.verifiedDate) {
    result.verifiedDate = options.verifiedDate;
  }

  return result;
}

function optionalContextValues(
  verifiedAt?: string,
  verifiedDate?: string
): { verifiedAt?: string; verifiedDate?: string } {
  const result: { verifiedAt?: string; verifiedDate?: string } = {};

  if (verifiedAt) {
    result.verifiedAt = verifiedAt;
  }
  if (verifiedDate) {
    result.verifiedDate = verifiedDate;
  }

  return result;
}

/**
 * Generate a cache key for a context tag.
 * Uses file path + tag id (or line-based fallback).
 */
function cacheKey(tag: ContextTag): string {
  const base = tag.location.file;
  if (tag.id) {
    return `${base}:#${tag.id}`;
  }
  return `${base}:${tag.type}:L${String(tag.location.line)}`;
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
export function extractBlock(lines: string[], tagLineIndex: number): string {
  const blockLines: string[] = [];
  let consecutiveBlanks = 0;

  // Find the indentation level of the tag line
  // eslint-plugin-security flags numeric array indexing generically; this is a local line array.
  // eslint-disable-next-line security/detect-object-injection
  const tagLine = lines[tagLineIndex];
  const tagIndent = tagLine ? tagLine.search(/\S/) : 0;

  for (let i = tagLineIndex + 1; i < lines.length; i++) {
    // eslint-plugin-security flags numeric array indexing generically; this is a local line array.
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    // Stop at another @context tag
    const innerComment = stripCommentDelimiters(line);
    if (innerComment && isContextTagCandidate(innerComment)) {
      break;
    }

    // Track consecutive blank lines
    if (trimmed === "") {
      consecutiveBlanks++;
      if (consecutiveBlanks >= 2) {
        break;
      }
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
// @context decision {@link file:packages/spec/staleness.md} !critical [verified:2026-03-24] -- Freshness has two gates working
//   together: max-age expiration and "code changed without advancing verified date".
//   If the anchored block hash changes and the date does not move forward, the context must go stale.
export function computeStaleness(
  tags: ContextTag[],
  sourceLines: string[],
  cache: StalenessCache,
  options: StalenessOptions = {}
): AnchoredContext[] {
  const maxAgeDays = options.maxAgeDays ?? 90;
  const now = options.now ?? new Date();

  return tags.map((tag): AnchoredContext => {
    const key = cacheKey(tag);
    const block = extractBlock(sourceLines, tag.location.line - 1);
    const currentHash = hashBlock(block);
    // eslint-disable-next-line security/detect-object-injection
    const cached = cache.entries[key];
    const verifiedDate = tag.verified;

    if (isExpired(verifiedDate, maxAgeDays, now)) {
      return withOptionalContext(
        {
          tag,
          blockHash: currentHash,
          status: "review-required",
          reason: "verification-date-expired",
        },
        optionalContextValues(cached?.verifiedAt, verifiedDate)
      );
    }

    if (!cached) {
      // First time seeing this tag — treat as verified
      return withOptionalContext(
        { tag, blockHash: currentHash, status: "verified", reason: "fresh" },
        optionalContextValues(undefined, verifiedDate)
      );
    }

    if (cached.blockHash === currentHash) {
      // Block hasn't changed since last verification
      return withOptionalContext(
        { tag, blockHash: currentHash, status: "verified", reason: "fresh" },
        optionalContextValues(cached.verifiedAt, verifiedDate)
      );
    }

    if (!verifiedDate) {
      return withOptionalContext(
        { tag, blockHash: currentHash, status: "stale", reason: "missing-verification-date" },
        optionalContextValues(cached.verifiedAt)
      );
    }

    if (!cached.verifiedDate || verifiedDate > cached.verifiedDate) {
      return withOptionalContext(
        { tag, blockHash: currentHash, status: "verified", reason: "date-bumped" },
        optionalContextValues(cached.verifiedAt, verifiedDate)
      );
    }

    // Block changed — mark as stale
    return withOptionalContext(
      { tag, blockHash: currentHash, status: "stale", reason: "code-changed-without-date-bump" },
      optionalContextValues(cached.verifiedAt, verifiedDate)
    );
  });
}

/**
 * Update the cache with current verification data.
 * Call this after a user confirms context is still accurate.
 */
// @context decision:assumption {@link file:packages/spec/staleness.md} !high [verified:2026-03-24] -- Cache entries only persist
//   verified contexts. Stale or review-required entries must not overwrite the last known verified block/date.
export function updateCache(cache: StalenessCache, anchored: AnchoredContext[]): StalenessCache {
  const updated = { ...cache, entries: { ...cache.entries } };
  const now = new Date().toISOString();

  for (const entry of anchored) {
    if (entry.status !== "verified") {
      continue;
    }

    const key = cacheKey(entry.tag);
    const nextEntry: CacheEntry = {
      blockHash: entry.blockHash,
      verifiedAt: now,
    };
    if (entry.verifiedDate) {
      nextEntry.verifiedDate = entry.verifiedDate;
    }
    // eslint-disable-next-line security/detect-object-injection
    updated.entries[key] = nextEntry;
  }

  return updated;
}
