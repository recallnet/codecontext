import matter from "gray-matter";
import type { CtxFile, CtxFileFrontmatter, CtxFileSection } from "./types.js";
import { isValidType } from "./taxonomy.js";

export class CtxFileError extends Error {
  constructor(
    message: string,
    public filePath: string,
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
  if (!data.id || typeof data.id !== "string") {
    throw new CtxFileError("Missing or invalid 'id' in frontmatter", filePath);
  }

  if (!data.type || !isValidType(data.type)) {
    throw new CtxFileError(
      `Missing or invalid 'type' in frontmatter: "${data.type}"`,
      filePath,
    );
  }

  const status = data.status ?? "active";
  if (!["active", "superseded", "deprecated"].includes(status)) {
    throw new CtxFileError(
      `Invalid status "${status}". Must be: active, superseded, or deprecated`,
      filePath,
    );
  }

  const frontmatter: CtxFileFrontmatter = {
    id: data.id,
    type: data.type,
    status,
    verified: data.verified ? String(data.verified) : "",
    owners: Array.isArray(data.owners)
      ? data.owners.map(String)
      : typeof data.owners === "string"
        ? [data.owners]
        : [],
    traces: Array.isArray(data.traces)
      ? data.traces.map(String)
      : typeof data.traces === "string"
        ? [data.traces]
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
    const headingMatch = line.match(/^##\s+(.+)$/);
    if (headingMatch) {
      if (currentHeading) {
        sections.push({
          heading: currentHeading,
          content: currentContent.join("\n").trim(),
        });
      }
      currentHeading = headingMatch[1];
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
