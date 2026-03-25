import { isValidSubtype, isValidType } from "./taxonomy.js";
import type { ContextSubtype, ContextTag, Priority, SourceLocation } from "./types.js";

/**
 * Regex for the `@context` tag format:
 *   `@context <type>[:<subtype>] [{@link <target>}] [!priority] [verified:YYYY-MM-DD] — <summary>`
 *
 * Supports both the canonical `@context <type>` form and the legacy
 * `@context:<type>` form, plus both em-dash (—) and double-dash (--)
 * separators.
 */
// @context decision:constraint {@link file:packages/spec/syntax.md} !critical [verified:2026-03-24] -- Canonical syntax stays
//   TSDoc-safe by treating decision:tradeoff as payload after @context, not as part of the tag name.
//   Legacy @context:<type> remains parseable for compatibility, but new syntax must preserve the canonical form.
const CONTEXT_PATTERN =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^@context(?:\s+|:)([a-z][a-z0-9]*)(?::([a-z][a-z0-9]*))?\s*(?:\{@link\s+([^}\s]+)\})?\s*(?:!(critical|high|low))?\s*(?:\[verified:(\d{4}-\d{2}-\d{2})\])?\s*(?:—|--)\s*(.+)$/;

const CONTEXT_PREFIX_PATTERN = /^@context(?:\s+|:)/;

/**
 * Patterns to strip comment delimiters from a line.
 * Ordered: try block-comment continuation first, then line comments.
 */
const COMMENT_STRIPPERS: ((line: string) => string | null)[] = [
  // Block comment continuation: " * text" or " */ text"
  (line) => {
    const m = /^\s*\*\/?(.*)$/.exec(line);
    const captured = m?.[1];
    return captured !== undefined ? captured.trim() : null;
  },
  // JSX comment: {/* text */}
  (line) => {
    const m = /^\s*\{\/\*\s*(.*?)\s*\*\/\}$/.exec(line);
    return m?.[1] ?? null;
  },
  // Block comment start: /* text or /** text
  (line) => {
    // eslint-disable-next-line security/detect-unsafe-regex
    const m = /^\s*\/\*\*?\s*(.*?)(?:\s*\*\/)?$/.exec(line);
    const captured = m?.[1];
    return captured !== undefined ? captured.trim() : null;
  },
  // Line comment: // text
  (line) => {
    const m = /^\s*\/\/\s?(.*)$/.exec(line);
    const captured = m?.[1];
    return captured !== undefined ? captured.trim() : null;
  },
  // Hash comment: # text (Python, Ruby, Shell)
  (line) => {
    const m = /^\s*#\s?(.*)$/.exec(line);
    const captured = m?.[1];
    return captured !== undefined ? captured.trim() : null;
  },
  // Double-dash comment: -- text (SQL, Lua, Haskell)
  (line) => {
    const m = /^\s*--\s?(.*)$/.exec(line);
    const captured = m?.[1];
    return captured !== undefined ? captured.trim() : null;
  },
];

export interface ParseError {
  message: string;
  location: SourceLocation;
}

export interface ParseResult {
  tags: ContextTag[];
  errors: ParseError[];
}

function isValidVerifiedDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().startsWith(value);
}

export function isContextTagCandidate(text: string): boolean {
  return CONTEXT_PREFIX_PATTERN.test(text.trim());
}

/**
 * Strip comment delimiters from a line, returning the inner text.
 * Returns null if the line is not a comment.
 */
export function stripCommentDelimiters(line: string): string | null {
  for (const stripper of COMMENT_STRIPPERS) {
    const result = stripper(line);
    if (result !== null) {
      return result;
    }
  }
  return null;
}

function parseSingleTag(
  inner: string,
  line: string,
  filePath: string,
  lineNumber: number,
  errors: ParseError[]
): ContextTag | null {
  const match = CONTEXT_PATTERN.exec(inner);
  if (!match) {
    if (isContextTagCandidate(inner)) {
      errors.push({
        message: `Malformed @context tag: "${inner}"`,
        location: { file: filePath, line: lineNumber, column: 1 },
      });
    }
    return null;
  }

  const typeStr = match[1];
  const subtypeStr = match[2];
  const id = match[3];
  const priorityStr = match[4];
  const verified = match[5];
  const summary = match[6];

  if (!typeStr || !summary) {
    return null;
  }

  if (!isValidType(typeStr)) {
    errors.push({
      message: `Unknown context type: "${typeStr}"`,
      location: { file: filePath, line: lineNumber, column: 1 },
    });
    return null;
  }

  if (subtypeStr && !isValidSubtype(typeStr, subtypeStr)) {
    errors.push({
      message: `Invalid subtype "${subtypeStr}" for type "${typeStr}"`,
      location: { file: filePath, line: lineNumber, column: 1 },
    });
    return null;
  }

  if (verified && !isValidVerifiedDate(verified)) {
    errors.push({
      message: `Invalid verification date "${verified}". Expected YYYY-MM-DD.`,
      location: { file: filePath, line: lineNumber, column: 1 },
    });
    return null;
  }

  const tag: ContextTag = {
    raw: line,
    type: typeStr,
    summary: summary.trim(),
    location: { file: filePath, line: lineNumber, column: 1 },
  };

  if (subtypeStr !== undefined) {
    tag.subtype = subtypeStr as ContextSubtype;
  }
  if (id !== undefined) {
    tag.id = id;
  }
  if (priorityStr !== undefined) {
    tag.priority = priorityStr as Priority;
  }
  if (verified !== undefined) {
    tag.verified = verified;
  }

  return tag;
}

/**
 * Parse all @context tags from a source file's text content.
 */
export function parseContextTags(source: string, filePath: string): ParseResult {
  const lines = source.split("\n");
  const tags: ContextTag[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    // eslint-plugin-security flags numeric array indexing generically; this is a local line array.
    // eslint-disable-next-line security/detect-object-injection
    const line = lines[i] ?? "";
    const inner = stripCommentDelimiters(line);
    if (!inner || !isContextTagCandidate(inner)) {
      continue;
    }

    const tag = parseSingleTag(inner, line, filePath, i + 1, errors);
    if (tag) {
      tags.push(tag);
    }
  }

  return { tags, errors };
}
