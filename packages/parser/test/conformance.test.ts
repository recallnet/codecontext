import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import { buildFileContext, parseContextTags } from "../src/index.js";

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
  filePathByImplementation?: Record<string, string>;
  sourceByImplementation?: Record<string, string>;
  supportFiles?: Record<string, string>;
  expected: {
    tags: FixtureTag[];
    errors: string[];
  };
}

function loadFixtures(): Fixture[] {
  return readdirSync(fixturesDir)
    .filter((entry) => entry.endsWith(".json"))
    .map((entry) => JSON.parse(readFileSync(join(fixturesDir, entry), "utf-8")) as Fixture)
    .filter((fixture) => fixture.implementations.includes("ts"));
}

// @context decision {@link file:packages/conformance-fixtures/README.md} !high [verified:2026-03-24] -- Shared fixtures are the
//   cross-language spec contract. Per-implementation source overrides keep one expected normalized output while allowing
//   Go, TS, and Python to express the same case in native comment syntax.
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

  const sourcePath = join(root, fixture.filePathByImplementation?.ts ?? fixture.filePath);
  mkdirSync(dirname(sourcePath), { recursive: true });
  writeFileSync(sourcePath, fixture.sourceByImplementation?.ts ?? fixture.source, "utf-8");

  return sourcePath;
}

function normalizeFixtureTags(tags: FixtureTag[]): FixtureTag[] {
  return tags.map((tag) => ({
    ...tag,
    verified: tag.verified ?? null,
  }));
}

function referenceExists(projectRoot: string, contextDir: string, ref: string): boolean {
  if (ref.startsWith("http://") || ref.startsWith("https://")) {
    return true;
  }

  const normalized = ref.startsWith("file:") ? ref.slice("file:".length) : ref;
  const candidates =
    normalized.includes("/") || normalized.includes(".")
      ? [resolve(projectRoot, normalized)]
      : [resolve(projectRoot, normalized), resolve(projectRoot, contextDir, normalized)];

  return candidates.some((candidate) => {
    try {
      readFileSync(candidate, "utf-8");
      return true;
    } catch {
      return false;
    }
  });
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

    if (
      !referenceExists(projectRoot, contextDir, tag.id) &&
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
      expect(ctx.tags).toHaveLength(fixture.expected.tags.length);
    });
  }
});
