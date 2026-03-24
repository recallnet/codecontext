import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

import { buildFileContext } from "../src/utils.js";

describe("buildFileContext", () => {
  it("resolves direct project-relative .ctx.md references", () => {
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

    writeFileSync(
      join(contextDir, "cache-strategy.ctx.md"),
      [
        "---",
        "id: cache-strategy",
        "type: decision",
        "verified: 2026-03-24",
        "---",
        "",
        "## Decision",
        "",
        "Use an in-process LRU cache.",
      ].join("\n"),
      "utf-8"
    );

    const sourceFile = join(sourceDir, "example.ts");
    writeFileSync(
      sourceFile,
      "// @context decision:tradeoff #docs/context/cache-strategy.ctx.md -- LRU keeps eviction O(1).\n" +
        "export const strategy = 'lru';\n",
      "utf-8"
    );

    const ctx = buildFileContext(sourceFile);

    expect(ctx.resolvedCtxFiles.has("docs/context/cache-strategy.ctx.md")).toBe(true);
    expect(ctx.resolvedCtxFiles.get("docs/context/cache-strategy.ctx.md")?.frontmatter.id).toBe(
      "cache-strategy"
    );
    expect(ctx.tags[0]?.verified).toBe("2026-03-24");
    expect(ctx.anchored[0]?.verifiedDate).toBe("2026-03-24");
  });
});
