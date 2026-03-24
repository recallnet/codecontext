import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import {
  buildFileContext,
  loadCtxFileById,
  loadCtxFileByRef,
  parseContextTags,
} from "../src/index.js";

const repoRoot = fileURLToPath(new URL("../../..", import.meta.url));
const fixturesDir = join(repoRoot, "packages", "conformance-fixtures", "cases");

interface FixtureTag {
  type: string;
  subtype: string | null;
  id: string | null;
  priority: string | null;
  verified?: string | null;
  summary: string;
  line: number;
}

interface Fixture {
  id: string;
  description: string;
  implementations: string[];
  filePath: string;
  source: string;
  supportFiles?: Record<string, string>;
  expected: {
    tags: FixtureTag[];
    errors: string[];
    resolvedCtxFiles: string[];
  };
}

function loadFixtures(): Fixture[] {
  return readdirSync(fixturesDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => JSON.parse(readFileSync(join(fixturesDir, entry), "utf-8")) as Fixture)
    .filter((fixture) => fixture.implementations.includes("ts"));
}

function writeFixtureProject(fixture: Fixture): string {
  const root = mkdtempSync(join(tmpdir(), `codecontext-${fixture.id}-`));

  writeFileSync(
    join(root, "package.json"),
    JSON.stringify({ name: fixture.id, private: true }, null, 2),
    "utf-8"
  );

  if (fixture.supportFiles) {
    for (const [relativePath, content] of Object.entries(fixture.supportFiles)) {
      const absPath = join(root, relativePath);
      mkdirSync(dirname(absPath), { recursive: true });
      writeFileSync(absPath, content, "utf-8");
    }
  }

  const sourcePath = join(root, fixture.filePath);
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, fixture.source, "utf-8");

  return sourcePath;
}

function normalizeFixtureTags(tags: FixtureTag[]): FixtureTag[] {
  return tags.map((tag) => ({
    ...tag,
    verified: tag.verified ?? null,
  }));
}

function collectErrors(fixture: Fixture, sourcePath: string): string[] {
  const source = readFileSync(sourcePath, "utf-8");
  const parseResult = parseContextTags(source, sourcePath);
  const errors = parseResult.errors.map((error) => error.message);
  const ctx = buildFileContext(sourcePath);
  const projectRoot = dirname(dirname(sourcePath));
  const contextDir = join(projectRoot, "docs", "context");

  for (const tag of ctx.tags) {
    if (!tag.id) {
      continue;
    }

    const resolved = loadCtxFileByRef(tag.id, projectRoot) ?? loadCtxFileById(tag.id, contextDir);
    if (
      !resolved &&
      fixture.expected.errors.includes(`Unresolved context reference: "${tag.id}"`)
    ) {
      errors.push(`Unresolved context reference: "${tag.id}"`);
    }
  }

  return errors;
}

describe("shared conformance fixtures", () => {
  for (const fixture of loadFixtures()) {
    it(fixture.description, () => {
      const sourcePath = writeFixtureProject(fixture);
      const source = readFileSync(sourcePath, "utf-8");
      const parseResult = parseContextTags(source, sourcePath);
      const ctx = buildFileContext(sourcePath);

      expect(
        parseResult.tags.map((tag) => ({
          type: tag.type,
          subtype: tag.subtype ?? null,
          id: tag.id ?? null,
          priority: tag.priority ?? null,
          verified: tag.verified ?? null,
          summary: tag.summary,
          line: tag.location.line,
        }))
      ).toEqual(normalizeFixtureTags(fixture.expected.tags));

      expect(collectErrors(fixture, sourcePath)).toEqual(fixture.expected.errors);
      expect([...ctx.resolvedCtxFiles.keys()].sort()).toEqual(
        [...fixture.expected.resolvedCtxFiles].sort()
      );
    });
  }
});
