import { describe, it, expect } from "vitest";

import { parseCtxFile, CtxFileError } from "../src/ctx-file-parser.js";

describe("parseCtxFile", () => {
  const filePath = "context/auth-choice.ctx.md";

  it("parses valid .ctx.md with all frontmatter fields", () => {
    const content = [
      "---",
      "id: auth-choice",
      "type: decision",
      "status: active",
      "verified: 2025-06-01",
      "owners:",
      "  - alice",
      "  - bob",
      "traces:",
      "  - JIRA-1234",
      "  - REQ-567",
      "---",
      "",
      "## Context",
      "",
      "We chose JWT for auth.",
      "",
      "## Alternatives",
      "",
      "Session-based auth was considered.",
    ].join("\n");

    const result = parseCtxFile(content, filePath);

    expect(result.frontmatter.id).toBe("auth-choice");
    expect(result.frontmatter.type).toBe("decision");
    expect(result.frontmatter.status).toBe("active");
    // gray-matter parses dates; String() produces a date string representation
    expect(result.frontmatter.verified).toBeTruthy();
    expect(result.frontmatter.owners).toEqual(["alice", "bob"]);
    expect(result.frontmatter.traces).toEqual(["JIRA-1234", "REQ-567"]);
    expect(result.filePath).toBe(filePath);
  });

  it("parses sections from markdown body", () => {
    const content = [
      "---",
      "id: test-sections",
      "type: decision",
      "---",
      "",
      "## Context",
      "",
      "Some context here.",
      "",
      "## Decision",
      "",
      "We decided to do X.",
      "",
      "## Consequences",
      "",
      "This means Y.",
    ].join("\n");

    const result = parseCtxFile(content, filePath);

    expect(result.sections).toHaveLength(3);
    expect(result.sections[0].heading).toBe("Context");
    expect(result.sections[0].content).toBe("Some context here.");
    expect(result.sections[1].heading).toBe("Decision");
    expect(result.sections[1].content).toBe("We decided to do X.");
    expect(result.sections[2].heading).toBe("Consequences");
    expect(result.sections[2].content).toBe("This means Y.");
  });

  it("handles missing optional fields (owners, traces default to [])", () => {
    const content = [
      "---",
      "id: minimal",
      "type: risk",
      "status: active",
      "---",
      "",
      "## Details",
      "",
      "Minimal content.",
    ].join("\n");

    const result = parseCtxFile(content, filePath);

    expect(result.frontmatter.owners).toEqual([]);
    expect(result.frontmatter.traces).toEqual([]);
    expect(result.frontmatter.verified).toBe("");
  });

  it("throws CtxFileError for missing id", () => {
    const content = ["---", "type: decision", "status: active", "---", "", "Body text."].join("\n");

    expect(() => parseCtxFile(content, filePath)).toThrow(CtxFileError);
    expect(() => parseCtxFile(content, filePath)).toThrow(/Missing or invalid 'id'/);
  });

  it("throws CtxFileError for invalid type", () => {
    const content = ["---", "id: bad-type", "type: banana", "---", "", "Body text."].join("\n");

    expect(() => parseCtxFile(content, filePath)).toThrow(CtxFileError);
    expect(() => parseCtxFile(content, filePath)).toThrow(/Missing or invalid 'type'/);
  });

  it("throws CtxFileError for missing type", () => {
    const content = ["---", "id: no-type", "---", "", "Body text."].join("\n");

    expect(() => parseCtxFile(content, filePath)).toThrow(CtxFileError);
    expect(() => parseCtxFile(content, filePath)).toThrow(/Missing or invalid 'type'/);
  });

  it("throws CtxFileError for invalid status", () => {
    const content = [
      "---",
      "id: bad-status",
      "type: decision",
      "status: archived",
      "---",
      "",
      "Body text.",
    ].join("\n");

    expect(() => parseCtxFile(content, filePath)).toThrow(CtxFileError);
    expect(() => parseCtxFile(content, filePath)).toThrow(/Invalid status "archived"/);
  });

  it("defaults status to 'active' when omitted", () => {
    const content = ["---", "id: no-status", "type: decision", "---", "", "Body text."].join("\n");

    const result = parseCtxFile(content, filePath);
    expect(result.frontmatter.status).toBe("active");
  });

  it("handles single string owner as array", () => {
    const content = [
      "---",
      "id: single-owner",
      "type: decision",
      "owners: alice",
      "---",
      "",
      "Body.",
    ].join("\n");

    const result = parseCtxFile(content, filePath);
    expect(result.frontmatter.owners).toEqual(["alice"]);
  });

  it("handles single string trace as array", () => {
    const content = [
      "---",
      "id: single-trace",
      "type: decision",
      "traces: JIRA-100",
      "---",
      "",
      "Body.",
    ].join("\n");

    const result = parseCtxFile(content, filePath);
    expect(result.frontmatter.traces).toEqual(["JIRA-100"]);
  });

  it("includes trimmed body text", () => {
    const content = [
      "---",
      "id: body-test",
      "type: doc",
      "---",
      "",
      "  Some body text here.  ",
      "",
    ].join("\n");

    const result = parseCtxFile(content, filePath);
    expect(result.body).toBe("Some body text here.");
  });

  it("CtxFileError includes filePath in message", () => {
    const content = ["---", "type: decision", "---", "", "Body."].join("\n");

    try {
      parseCtxFile(content, filePath);
      expect.unreachable("Should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(CtxFileError);
      expect((err as CtxFileError).message).toContain(filePath);
      expect((err as CtxFileError).filePath).toBe(filePath);
    }
  });
});
