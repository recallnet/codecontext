# Staleness Model

**Version:** 1.0.0-draft
**Parent document:** [SPEC.md](SPEC.md)

This document defines how codecontext tracks whether context tags remain accurate as code evolves. The staleness model uses content-addressable hashing to detect changes in the code associated with a context tag.

## Overview

The staleness model answers one question: **has the code changed since the context was last verified?**

It works in three steps:

1. **Identify** the logical block of code associated with each `@context` tag.
2. **Hash** the logical block's content to produce a fingerprint.
3. **Compare** the current fingerprint with the stored fingerprint to determine status.

## Logical Block Identification

The **logical block** is the region of code that a context tag describes. It is the code immediately following the comment(s) containing the `@context` tag.

### Rules

1. The logical block starts at the first non-comment, non-blank line after the context tag (or context block, if multi-line).
2. The logical block's extent depends on the language construct at the start line:
   - **Function/method declaration:** The entire function body, including signature.
   - **Class/struct/interface declaration:** The entire declaration, including all members.
   - **Variable/constant declaration:** The single declaration statement.
   - **Control flow statement (if, for, while, match, etc.):** The statement and its body.
   - **Import/include statement:** The single statement.
   - **Any other statement:** The single statement up to its terminator.
3. If the construct is brace-delimited (`{}`), the block extends from the opening line through the matching closing brace.
4. If the construct is indentation-delimited (Python, YAML, etc.), the block extends through all lines at a deeper indentation level than the construct's start line.
5. If the context tag appears at file scope (not before any specific construct), the logical block is the entire file.

### Ambiguity Resolution

When a parser cannot determine the logical block (e.g., in an unfamiliar language or an ambiguous syntactic position), it SHOULD fall back to one of:

- **Next N lines:** Use a configurable number of lines (default: 10) following the context tag.
- **Next blank-line-delimited paragraph:** All non-blank lines following the tag until the next blank line.

A parser MUST document which strategy it uses for each supported language.

## Content-Addressable Hashing

### Normalization

Before hashing, the logical block's text MUST be normalized:

1. **Strip leading/trailing blank lines** from the block.
2. **Normalize line endings** to `\n` (LF).
3. **Collapse horizontal whitespace:** Replace each run of spaces and tabs with a single space.
4. **Trim trailing whitespace** from each line.
5. **Remove comment-only lines** from the block. (Changes to comments within the block do not affect the hash.)
6. **Strip blank lines** within the block. (Formatting changes do not affect the hash.)

The goal of normalization is to produce a stable hash that changes only when the *semantic content* of the code changes, not when formatting or comments are modified.

### Hash Computation

1. Apply normalization to the logical block text.
2. Encode the normalized text as UTF-8.
3. Compute the SHA-256 hash of the encoded bytes.
4. Retain the first 16 hexadecimal characters of the hash digest.

The hash algorithm and length MAY be overridden in `codecontext.json` via the `hashAlgorithm` and `hashLength` fields.

### Example

Given this code:

```typescript
// @context:decision:tradeoff #cache-strategy !high — LRU over LFU for O(1) eviction
function evict(cache: Map<string, Entry>): void {
  const oldest = cache.keys().next().value;
  cache.delete(oldest);
}
```

The logical block is:

```typescript
function evict(cache: Map<string, Entry>): void {
  const oldest = cache.keys().next().value;
  cache.delete(oldest);
}
```

After normalization:

```
function evict(cache: Map<string, Entry>): void {
 const oldest = cache.keys().next().value;
 cache.delete(oldest);
}
```

The SHA-256 hash of this normalized text (UTF-8 encoded) is computed, and the first 16 hex characters are stored.

## Status Progression

Each context tag's staleness status follows this progression:

```
verified ──> stale ──> review-required
   ^           │              │
   └───────────┴──────────────┘
              (re-verify)
```

### verified

The content hash of the current logical block matches the stored hash. The context is considered accurate.

**Transitions to `stale`:** when the logical block changes and the recomputed hash no longer matches the stored hash.

### stale

The content hash has changed since the last verification. The code has been modified and the context may no longer be accurate.

**Transitions to `review-required`:** when the staleness duration exceeds the configured threshold (`stalenessThresholdDays` in `codecontext.json`, default 30 days).

**Transitions to `verified`:** when a developer or tool re-verifies the context (updates the stored hash).

### review-required

The context has been stale for longer than the configured threshold. This is an elevated alert that demands attention.

**Transitions to `verified`:** when a developer reviews and re-verifies the context.

### Status Determination Algorithm

```
function getStatus(tag, cache, config):
    entry = cache.lookup(tag.file, tag.line)
    if entry is null:
        return "untracked"

    currentHash = computeHash(tag.logicalBlock)
    if currentHash == entry.hash:
        return "verified"

    daysSinceVerified = today - entry.verifiedDate
    if daysSinceVerified > config.stalenessThresholdDays:
        return "review-required"

    return "stale"
```

## Cache Format

The staleness cache is stored in `.codecontext-cache.json` at the project root. This file SHOULD be added to `.gitignore` because it contains machine-local state (file paths and timestamps that may differ across checkouts).

### Schema

```json
{
  "version": "1.0",
  "generatedAt": "2025-11-15T10:30:00Z",
  "entries": {
    "src/cache/lru.ts": [
      {
        "line": 14,
        "tag": "@context:decision:tradeoff #cache-strategy !high",
        "hash": "a1b2c3d4e5f67890",
        "verifiedAt": "2025-11-15T10:30:00Z",
        "verifiedBy": "cli",
        "blockStart": 15,
        "blockEnd": 22
      }
    ],
    "src/auth/session.py": [
      {
        "line": 7,
        "tag": "@context:risk:security !critical",
        "hash": "f0e1d2c3b4a59687",
        "verifiedAt": "2025-11-10T08:00:00Z",
        "verifiedBy": "pre-commit",
        "blockStart": 8,
        "blockEnd": 35
      }
    ]
  }
}
```

### Entry Fields

| Field | Type | Description |
|-------|------|-------------|
| `line` | number | The 1-based line number of the `@context` tag in the source file. |
| `tag` | string | The full context tag text (without the summary), used for identification when line numbers shift. |
| `hash` | string | The truncated content hash of the logical block. |
| `verifiedAt` | string (ISO 8601) | Timestamp of the last verification. |
| `verifiedBy` | string | What performed the verification: `"cli"`, `"pre-commit"`, `"ci"`, `"ide"`, or a custom identifier. |
| `blockStart` | number | The 1-based start line of the logical block. |
| `blockEnd` | number | The 1-based end line of the logical block (inclusive). |

### Cache Regeneration

A conforming tool MUST be able to regenerate the cache from scratch by scanning all source files. The cache is an optimization, not a source of truth. If the cache file is missing or corrupted, a full scan produces a fresh cache with all tags in `stale` status (since no previous hashes exist for comparison).

## Integration Points

### Pre-commit Hook

A pre-commit hook integration SHOULD:

1. Scan modified files for `@context` tags.
2. Recompute hashes for affected logical blocks.
3. Update the cache with new hashes and `verifiedAt` timestamps for tags whose logical blocks have NOT changed.
4. Report tags whose logical blocks HAVE changed, prompting the committer to review.
5. Optionally block the commit if any `!critical` tags are stale.

### CI Checks

A CI integration SHOULD:

1. Regenerate the full cache from the repository contents.
2. Compare against the committed cache (if the project chooses to commit it) or against a baseline.
3. Report all stale and review-required tags.
4. Optionally fail the build if `review-required` tags exist.
5. Produce a summary report (count of verified, stale, review-required, and untracked tags).

### IDE Warnings

An IDE integration SHOULD:

1. Parse `@context` tags in the active editor.
2. Display inline indicators for staleness status (e.g., gutter icons, underlines).
3. Surface `!critical` stale tags with high-visibility warnings.
4. Provide a quick action to re-verify (update the hash) after review.

### Agent Queries

An AI agent or code assistant integration SHOULD:

1. Query the cache for context relevant to a given file or code range.
2. Include context tag information in prompts to improve response quality.
3. Flag stale context as potentially unreliable.
4. Suggest re-verification when stale context is referenced.

## Verification Workflow

When a developer encounters a stale context tag, the recommended workflow is:

1. **Read** the context tag and any associated `.ctx.md` file.
2. **Review** the code changes that caused staleness (via `git diff` or similar).
3. **Decide:**
   - If the context is still accurate: **re-verify** (update the hash in the cache).
   - If the context needs updating: **update** the tag and/or `.ctx.md` file, then re-verify.
   - If the context is no longer relevant: **deprecate** or **remove** the tag.
4. **Commit** the updated cache (if the project tracks it) or let the pre-commit hook update it.
