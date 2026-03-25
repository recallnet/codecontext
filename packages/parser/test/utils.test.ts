import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildFileContext } from "../src/utils.js";

describe("buildFileContext", () => {
  it("does not inherit verification dates from referenced files", () => {
    const root = mkdtempSync(join(tmpdir(), "codecontext-utils-"));
    const sourceDir = join(root, "src");
    const contextDir = join(root, "docs", "context");

    mkdirSync(sourceDir, { recursive: true });
    mkdirSync(contextDir, { recursive: true });

    writeFileSync(
      join(root, "package.json"),
      JSON.stringify({ name: "fixture", private: true }, null, 2),
      "utf-8"
    );

    writeFileSync(join(contextDir, "cache-strategy.md"), "Use an in-process LRU cache.\n", "utf-8");

    const sourceFile = join(sourceDir, "example.ts");
    writeFileSync(
      sourceFile,
      "// @context decision:tradeoff {@link file:docs/context/cache-strategy.md} -- LRU keeps eviction O(1).\n" +
        "export const strategy = 'lru';\n",
      "utf-8"
    );

    const ctx = buildFileContext(sourceFile);

    expect(ctx.tags[0]?.id).toBe("file:docs/context/cache-strategy.md");
    expect(ctx.tags[0]?.verified).toBeUndefined();
    expect(ctx.anchored[0]?.verifiedDate).toBeUndefined();
  });
});
