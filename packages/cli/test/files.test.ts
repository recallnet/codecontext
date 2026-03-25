import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { findSourceFiles, isSourceFile } from "../src/files.js";

const tempDirs: string[] = [];

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("isSourceFile", () => {
  it("matches modern JS and TS module extensions", () => {
    expect(isSourceFile("src/entry.mjs")).toBe(true);
    expect(isSourceFile("src/entry.cjs")).toBe(true);
    expect(isSourceFile("src/entry.mts")).toBe(true);
    expect(isSourceFile("src/entry.cts")).toBe(true);
  });
});

describe("findSourceFiles", () => {
  it("includes modern JS and TS module extensions in repo scans", () => {
    const root = mkdtempSync(join(tmpdir(), "codecontext-cli-files-"));
    tempDirs.push(root);

    mkdirSync(join(root, "src"), { recursive: true });
    writeFileSync(join(root, "src", "entry.mjs"), "// @context decision - ESM module\n");
    writeFileSync(join(root, "src", "entry.cjs"), "// @context decision - CommonJS module\n");
    writeFileSync(join(root, "src", "entry.mts"), "// @context decision - TS ESM module\n");
    writeFileSync(join(root, "src", "entry.cts"), "// @context decision - TS CJS module\n");
    writeFileSync(join(root, "src", "ignored.md"), "@context decision - not a source file\n");

    expect(findSourceFiles(root)).toEqual([
      join(root, "src", "entry.cjs"),
      join(root, "src", "entry.cts"),
      join(root, "src", "entry.mjs"),
      join(root, "src", "entry.mts"),
    ]);
  });
});
