import matter from "gray-matter";

import { isValidType } from "./taxonomy.js";
import type { CtxFile, CtxFileFrontmatter, CtxFileSection } from "./types.js";

export class CtxFileError extends Error {
  constructor(
    message: string,
    public filePath: string
  ) {
    super(`${filePath}: ${message}`);
    this.name = "CtxFileError";
  }
}

/**
 * Parse a .ctx.md file into a structured CtxFile object.
 */
export function parseCtxFile(content: string, filePath: string): CtxFile {
  const { data, content: body } = matter(content);

  // Validate required frontmatter fields
  const rawId = data["id"] as unknown;
  if (!rawId || typeof rawId !== "string") {
    throw new CtxFileError("Missing or invalid 'id' in frontmatter", filePath);
  }

  const rawType = data["type"] as unknown;
  if (!rawType || typeof rawType !== "string" || !isValidType(rawType)) {
    throw new CtxFileError(
      `Missing or invalid 'type' in frontmatter: "${String(rawType)}"`,
      filePath
    );
  }

  const rawStatus = data["status"] as unknown;
  const status = typeof rawStatus === "string" ? rawStatus : "active";
  if (!["active", "superseded", "deprecated"].includes(status)) {
    throw new CtxFileError(
      `Invalid status "${status}". Must be: active, superseded, or deprecated`,
      filePath
    );
  }

  const rawVerified = data["verified"] as unknown;
  const rawOwners = data["owners"] as unknown;
  const rawTraces = data["traces"] as unknown;

  const frontmatter: CtxFileFrontmatter = {
    id: rawId,
    type: rawType,
    status: status as CtxFileFrontmatter["status"],
    verified:
      rawVerified instanceof Date
        ? rawVerified.toISOString()
        : typeof rawVerified === "string"
          ? rawVerified
          : "",
    owners: Array.isArray(rawOwners)
      ? (rawOwners as unknown[]).map(String)
      : typeof rawOwners === "string"
        ? [rawOwners]
        : [],
    traces: Array.isArray(rawTraces)
      ? (rawTraces as unknown[]).map(String)
      : typeof rawTraces === "string"
        ? [rawTraces]
        : [],
  };

  const sections = parseSections(body);

  return { frontmatter, body: body.trim(), sections, filePath };
}

/**
 * Split markdown body into sections based on ## headings.
 */
function parseSections(body: string): CtxFileSection[] {
  const sections: CtxFileSection[] = [];
  const lines = body.split("\n");
  let currentHeading = "";
  let currentContent: string[] = [];

  for (const line of lines) {
    const headingMatch = /^##\s+(.+)$/.exec(line);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[1] ?? "";
      currentContent = [];
    } else {
      currentContent.push(line);
    }
  }

  // Push final section
  if (currentHeading) {
    sections.push({
      heading: currentHeading,
      content: currentContent.join("\n").trim(),
    });
  }

  return sections;
}
