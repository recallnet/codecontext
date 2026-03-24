import { describe, it, expect } from "vitest";

import {
  hashBlock,
  extractBlock,
  computeStaleness,
  createEmptyCache,
  updateCache,
} from "../src/staleness.js";
import type { ContextTag } from "../src/types.js";

function makeTag(overrides: Partial<ContextTag> = {}): ContextTag {
  return {
    raw: "// @context:decision — Test tag",
    type: "decision",
    summary: "Test tag",
    location: { file: "test.ts", line: 2, column: 1 },
    ...overrides,
  };
}

describe("hashBlock", () => {
  it("produces consistent hashes for the same input", () => {
    const block = "function foo() {\n  return 42;\n}";
    const hash1 = hashBlock(block);
    const hash2 = hashBlock(block);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(16);
  });

  it("produces different hashes for different input", () => {
    const hash1 = hashBlock("function foo() { return 1; }");
    const hash2 = hashBlock("function bar() { return 2; }");
    expect(hash1).not.toBe(hash2);
  });

  it("is whitespace-insensitive (trimmed lines)", () => {
    const block1 = "  function foo() {\n    return 42;\n  }";
    const block2 = "function foo() {\n  return 42;\n}";
    expect(hashBlock(block1)).toBe(hashBlock(block2));
  });

  it("ignores blank lines", () => {
    const block1 = "function foo() {\n\n  return 42;\n\n}";
    const block2 = "function foo() {\n  return 42;\n}";
    expect(hashBlock(block1)).toBe(hashBlock(block2));
  });

  it("returns a 16-character hex string", () => {
    const hash = hashBlock("some code");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);
  });
});

describe("extractBlock", () => {
  it("captures code until double blank line", () => {
    const lines = [
      "// @context:decision — Some decision",
      "function foo() {",
      "  return 42;",
      "}",
      "",
      "",
      "// unrelated code",
    ];

    const block = extractBlock(lines, 0);
    expect(block).toContain("function foo()");
    expect(block).toContain("return 42");
    expect(block).not.toContain("unrelated code");
  });

  it("captures code until closing brace at tag indent", () => {
    const lines = [
      "// @context:decision — Outer function",
      "function outer() {",
      "  function inner() {",
      "    return true;",
      "  }",
      "  return inner;",
      "}",
      "const next = 1;",
    ];

    const block = extractBlock(lines, 0);
    expect(block).toContain("function outer()");
    expect(block).toContain("return inner");
    expect(block).toContain("}");
    // The closing brace at indent 0 ends the block
    expect(block).not.toContain("const next");
  });

  it("stops at next @context tag", () => {
    const lines = [
      "// @context:decision — First decision",
      "const a = 1;",
      "const b = 2;",
      "// @context:risk — Second tag",
      "const c = 3;",
    ];

    const block = extractBlock(lines, 0);
    expect(block).toContain("const a = 1");
    expect(block).toContain("const b = 2");
    expect(block).not.toContain("const c = 3");
    expect(block).not.toContain("@context:risk");
  });

  it("captures until end of file when no terminator", () => {
    const lines = ["// @context:decision — Last function", "function last() {", "  return true;"];

    const block = extractBlock(lines, 0);
    expect(block).toContain("function last()");
    expect(block).toContain("return true");
  });

  it("handles indented tag with indented closing brace", () => {
    const lines = [
      "class Foo {",
      "  // @context:decision — Method choice",
      "  method() {",
      "    return 42;",
      "  }",
      "  otherMethod() {}",
      "}",
    ];

    const block = extractBlock(lines, 1);
    expect(block).toContain("method()");
    expect(block).toContain("return 42");
    // Closing brace at indent 2 matches tag indent 2, so block ends
    expect(block).not.toContain("otherMethod");
  });
});

describe("computeStaleness", () => {
  it("returns 'verified' for new tags (no cache)", () => {
    const tag = makeTag();
    const sourceLines = [
      "// @context:decision — Test tag",
      "function foo() {",
      "  return 42;",
      "}",
    ];
    const cache = createEmptyCache();

    const results = computeStaleness([tag], sourceLines, cache);

    expect(results).toHaveLength(1);
    expect(results[0].status).toBe("verified");
    expect(results[0].tag).toBe(tag);
    expect(results[0].blockHash).toBeTruthy();
    expect(results[0].verifiedAt).toBeUndefined();
  });

  it("returns 'verified' when hash matches cache", () => {
    const tag = makeTag({ id: "my-tag" });
    const sourceLines = [
      "// @context:decision — Test tag",
      "function foo() {",
      "  return 42;",
      "}",
    ];

    // First pass: populate cache
    const cache = createEmptyCache();
    const firstResults = computeStaleness([tag], sourceLines, cache);
    const updatedCache = updateCache(cache, firstResults);

    // Second pass: same code, should still be verified
    const secondResults = computeStaleness([tag], sourceLines, updatedCache);

    expect(secondResults).toHaveLength(1);
    expect(secondResults[0].status).toBe("verified");
    expect(secondResults[0].verifiedAt).toBeTruthy();
  });

  it("returns 'stale' when hash differs from cache", () => {
    const tag = makeTag({ id: "my-tag" });
    const originalLines = [
      "// @context:decision — Test tag",
      "function foo() {",
      "  return 42;",
      "}",
    ];

    // First pass: populate cache
    const cache = createEmptyCache();
    const firstResults = computeStaleness([tag], originalLines, cache);
    const updatedCache = updateCache(cache, firstResults);

    // Second pass: changed code
    const changedLines = [
      "// @context:decision — Test tag",
      "function foo() {",
      "  return 99;",
      "  console.log('changed');",
      "}",
    ];

    const secondResults = computeStaleness([tag], changedLines, updatedCache);

    expect(secondResults).toHaveLength(1);
    expect(secondResults[0].status).toBe("stale");
    expect(secondResults[0].verifiedAt).toBeTruthy();
  });

  it("handles multiple tags in one file", () => {
    const tag1 = makeTag({
      id: "tag-1",
      location: { file: "test.ts", line: 1, column: 1 },
    });
    const tag2 = makeTag({
      id: "tag-2",
      type: "risk",
      summary: "Second tag",
      location: { file: "test.ts", line: 4, column: 1 },
    });
    const sourceLines = [
      "// @context:decision — First tag",
      "const a = 1;",
      "",
      "// @context:risk — Second tag",
      "const b = 2;",
    ];

    const cache = createEmptyCache();
    const results = computeStaleness([tag1, tag2], sourceLines, cache);

    expect(results).toHaveLength(2);
    expect(results[0].status).toBe("verified");
    expect(results[1].status).toBe("verified");
  });

  it("uses file:type:line as cache key when tag has no id", () => {
    const tag = makeTag({
      id: undefined,
      location: { file: "test.ts", line: 3, column: 1 },
    });
    const sourceLines = ["", "// @context:decision — No id tag", "const x = 1;"];

    const cache = createEmptyCache();
    const first = computeStaleness([tag], sourceLines, cache);
    const updatedCache = updateCache(cache, first);

    // Same code => verified
    const second = computeStaleness([tag], sourceLines, updatedCache);
    expect(second[0].status).toBe("verified");
  });
});

describe("createEmptyCache", () => {
  it("returns a cache with version 1 and empty entries", () => {
    const cache = createEmptyCache();
    expect(cache.version).toBe(1);
    expect(cache.entries).toEqual({});
  });
});

describe("updateCache", () => {
  it("stores current hashes and verifiedAt timestamps", () => {
    const tag = makeTag({ id: "cached-tag" });
    const sourceLines = ["// @context:decision — Test tag", "function foo() { return 1; }"];

    const cache = createEmptyCache();
    const results = computeStaleness([tag], sourceLines, cache);
    const updated = updateCache(cache, results);

    const key = "test.ts:#cached-tag";
    expect(updated.entries[key]).toBeDefined();
    expect(updated.entries[key].blockHash).toBe(results[0].blockHash);
    expect(updated.entries[key].verifiedAt).toBeTruthy();
    // verifiedAt should be a valid ISO date string
    expect(new Date(updated.entries[key].verifiedAt).toISOString()).toBe(
      updated.entries[key].verifiedAt
    );
  });

  it("does not mutate the original cache", () => {
    const tag = makeTag({ id: "immutable-test" });
    const sourceLines = ["// @context:decision — Test tag", "const x = 1;"];

    const cache = createEmptyCache();
    const results = computeStaleness([tag], sourceLines, cache);
    const updated = updateCache(cache, results);

    expect(Object.keys(cache.entries)).toHaveLength(0);
    expect(Object.keys(updated.entries)).toHaveLength(1);
  });

  it("preserves existing cache entries when adding new ones", () => {
    const tag1 = makeTag({ id: "tag-a" });
    const tag2 = makeTag({
      id: "tag-b",
      location: { file: "test.ts", line: 5, column: 1 },
    });

    const sourceLines = [
      "// @context:decision — Tag A",
      "const a = 1;",
      "",
      "// @context:decision — Tag B",
      "const b = 2;",
    ];

    const cache = createEmptyCache();

    // Add first tag
    const r1 = computeStaleness([tag1], sourceLines, cache);
    const cache1 = updateCache(cache, r1);
    expect(Object.keys(cache1.entries)).toHaveLength(1);

    // Add second tag
    const r2 = computeStaleness([tag2], sourceLines, cache1);
    const cache2 = updateCache(cache1, r2);
    expect(Object.keys(cache2.entries)).toHaveLength(2);
    // First entry still present
    expect(cache2.entries["test.ts:#tag-a"]).toBeDefined();
    expect(cache2.entries["test.ts:#tag-b"]).toBeDefined();
  });
});
