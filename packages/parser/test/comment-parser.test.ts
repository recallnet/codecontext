import { describe, it, expect } from "vitest";

import { parseContextTags, stripCommentDelimiters } from "../src/comment-parser.js";

describe("parseContextTags", () => {
  const file = "test.ts";

  it("parses a basic @context decision tag with summary", () => {
    const source = `// @context decision — Use REST over GraphQL for simplicity`;
    const { tags, errors } = parseContextTags(source, file);

    expect(errors).toHaveLength(0);
    expect(tags).toHaveLength(1);
    expect(tags[0].type).toBe("decision");
    expect(tags[0].summary).toBe("Use REST over GraphQL for simplicity");
    expect(tags[0].location).toEqual({ file, line: 1, column: 1 });
  });

  it("parses the legacy @context:decision syntax for backwards compatibility", () => {
    const source = `// @context:decision — Legacy syntax still parses`;
    const { tags, errors } = parseContextTags(source, file);

    expect(errors).toHaveLength(0);
    expect(tags).toHaveLength(1);
    expect(tags[0].type).toBe("decision");
    expect(tags[0].summary).toBe("Legacy syntax still parses");
  });

  it("parses a tag with all fields: type, subtype, id, priority, summary", () => {
    const source =
      `// @context decision:tradeoff #docs/decisions/auth-choice.md !critical — ` +
      "Chose JWT over sessions for stateless scaling";
    const { tags, errors } = parseContextTags(source, file);

    expect(errors).toHaveLength(0);
    expect(tags).toHaveLength(1);

    const tag = tags[0];
    expect(tag.type).toBe("decision");
    expect(tag.subtype).toBe("tradeoff");
    expect(tag.id).toBe("docs/decisions/auth-choice.md");
    expect(tag.priority).toBe("critical");
    expect(tag.summary).toBe("Chose JWT over sessions for stateless scaling");
  });

  it("parses a tag with an explicit verification date", () => {
    const source =
      `// @context decision:tradeoff #docs/decisions/auth-choice.md !critical ` +
      `[verified:2026-03-24] — Chose JWT over sessions for stateless scaling`;
    const { tags, errors } = parseContextTags(source, file);

    expect(errors).toHaveLength(0);
    expect(tags).toHaveLength(1);
    expect(tags[0].verified).toBe("2026-03-24");
  });

  it("parses multiple tags from one file", () => {
    const source = [
      "const x = 1;",
      "// @context decision — First decision",
      "function foo() {}",
      "// @context risk:perf — Hot path, avoid allocations",
      "function bar() {}",
    ].join("\n");

    const { tags, errors } = parseContextTags(source, file);

    expect(errors).toHaveLength(0);
    expect(tags).toHaveLength(2);
    expect(tags[0].type).toBe("decision");
    expect(tags[0].location.line).toBe(2);
    expect(tags[1].type).toBe("risk");
    expect(tags[1].subtype).toBe("perf");
    expect(tags[1].location.line).toBe(4);
  });

  describe("comment styles", () => {
    it("parses // line comment", () => {
      const source = `// @context decision — Line comment style`;
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Line comment style");
    });

    it("parses /* block comment */", () => {
      const source = `/* @context decision — Block comment style */`;
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Block comment style");
    });

    it("parses /** JSDoc-style comment */", () => {
      const source = `/** @context decision — JSDoc comment style */`;
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("JSDoc comment style");
    });

    it("parses block comment continuation line ( * )", () => {
      const source = ["/**", " * @context decision — Block continuation style", " */"].join("\n");
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Block continuation style");
    });

    it("parses # hash comment (Python/Shell)", () => {
      const source = `# @context decision — Hash comment style`;
      const { tags, errors } = parseContextTags(source, "script.py");
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Hash comment style");
    });

    it("parses -- double-dash comment (SQL/Lua)", () => {
      const source = `-- @context decision — SQL comment style`;
      const { tags, errors } = parseContextTags(source, "query.sql");
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("SQL comment style");
    });

    it("parses JSX comment {/* @context ... */}", () => {
      const source = `{/* @context decision — JSX comment style */}`;
      const { tags, errors } = parseContextTags(source, "component.tsx");
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("JSX comment style");
    });
  });

  describe("separator styles", () => {
    it("handles em-dash separator", () => {
      const source = `// @context decision \u2014 Uses em-dash`;
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Uses em-dash");
    });

    it("handles double-dash separator", () => {
      const source = `// @context decision -- Uses double-dash`;
      const { tags, errors } = parseContextTags(source, file);
      expect(errors).toHaveLength(0);
      expect(tags).toHaveLength(1);
      expect(tags[0].summary).toBe("Uses double-dash");
    });
  });

  describe("error reporting", () => {
    it("reports error for malformed @context tag", () => {
      const source = `// @context decision missing separator`;
      const { tags, errors } = parseContextTags(source, file);
      expect(tags).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Malformed @context tag/);
      expect(errors[0].location).toEqual({ file, line: 1, column: 1 });
    });

    it("reports error for unknown type", () => {
      const source = `// @context foobar — Some summary`;
      const { tags, errors } = parseContextTags(source, file);
      expect(tags).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Unknown context type: "foobar"/);
    });

    it("reports error for invalid subtype", () => {
      const source = `// @context decision:notreal — Some summary`;
      const { tags, errors } = parseContextTags(source, file);
      expect(tags).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Invalid subtype "notreal" for type "decision"/);
    });

    it("reports error for an invalid verification date", () => {
      const source = `// @context decision [verified:2026-02-31] — Some summary`;
      const { tags, errors } = parseContextTags(source, file);
      expect(tags).toHaveLength(0);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toMatch(/Invalid verification date "2026-02-31"/);
    });
  });

  it("ignores non-context comments", () => {
    const source = [
      "// This is a regular comment",
      "// TODO: fix this later",
      "/* Some block comment */",
      "const x = 42;",
    ].join("\n");

    const { tags, errors } = parseContextTags(source, file);
    expect(tags).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("ignores lines that are not comments", () => {
    const source = `const x = "@context decision — not a real tag";`;
    const { tags, errors } = parseContextTags(source, file);
    expect(tags).toHaveLength(0);
    expect(errors).toHaveLength(0);
  });

  it("stores the raw line text", () => {
    const raw = "  // @context risk:security !high — Sanitize user input";
    const { tags } = parseContextTags(raw, file);
    expect(tags).toHaveLength(1);
    expect(tags[0].raw).toBe(raw);
  });
});

describe("stripCommentDelimiters", () => {
  it("strips // line comment", () => {
    expect(stripCommentDelimiters("// hello world")).toBe("hello world");
  });

  it("strips //  with extra space", () => {
    expect(stripCommentDelimiters("  // spaced")).toBe("spaced");
  });

  it("strips /* block comment */", () => {
    expect(stripCommentDelimiters("/* block content */")).toBe("block content");
  });

  it("strips /** JSDoc opening", () => {
    expect(stripCommentDelimiters("/** jsdoc content */")).toBe("jsdoc content");
  });

  it("strips block continuation line ( * )", () => {
    expect(stripCommentDelimiters(" * continuation text")).toBe("continuation text");
  });

  it("strips # hash comment", () => {
    expect(stripCommentDelimiters("# hash comment")).toBe("hash comment");
  });

  it("strips -- double-dash comment", () => {
    expect(stripCommentDelimiters("-- sql comment")).toBe("sql comment");
  });

  it("strips JSX comment {/* ... */}", () => {
    expect(stripCommentDelimiters("{/* jsx content */}")).toBe("jsx content");
  });

  it("returns null for non-comment lines", () => {
    expect(stripCommentDelimiters("const x = 1;")).toBeNull();
    expect(stripCommentDelimiters("function foo() {}")).toBeNull();
  });
});
