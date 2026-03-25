import { describe, expect, it, vi } from "vitest";

import { formatProjectReport } from "../src/formatters/report.js";
import type { ProjectReport } from "../src/report.js";

describe("formatProjectReport", () => {
  it("groups entries by review state and taxonomy", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-25T04:30:00.000Z"));

    const report: ProjectReport = {
      root: "/repo",
      generatedAt: "2026-03-25T04:30:00.000Z",
      filesScanned: 4,
      entries: [
        {
          file: "/repo/src/auth.ts",
          line: 10,
          type: "decision",
          subtype: "tradeoff",
          id: "docs/auth.md",
          priority: "critical",
          status: "verified",
          summary: "Use sessions over JWT for revocation",
        },
        {
          file: "/repo/src/cache.ts",
          line: 22,
          type: "decision",
          subtype: "assumption",
          priority: "high",
          status: "review-required",
          summary: "Single-region writes remain acceptable",
        },
        {
          file: "/repo/src/query.ts",
          line: 7,
          type: "risk",
          subtype: "perf",
          status: "stale",
          summary: "Nested loop is acceptable under current dataset size",
        },
        {
          file: "/repo/src/migrate.ts",
          line: 2,
          type: "history",
          status: "verified",
          summary: "Switched import strategy after vendor API changes",
        },
        {
          file: "/repo/src/spec.ts",
          line: 3,
          type: "requirement",
          id: "docs/spec.html",
          status: "verified",
          summary: "Implements the external billing rounding rule",
        },
      ],
    };

    const output = formatProjectReport(report);

    expect(output).toContain("Needs Review (2)");
    expect(output).toContain("Decisions (1)");
    expect(output).toContain("Risks (1)");
    expect(output).toContain("Assumptions (1)");
    expect(output).toContain("History (1)");
    expect(output).toContain("Other Context (1)");
    expect(output).toContain("Reference summary: 2 linked, 3 inline-only.");

    vi.useRealTimers();
  });
});
