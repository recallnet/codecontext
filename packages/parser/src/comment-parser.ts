import type { ContextTag, SourceLocation } from "./types.js";
import { isValidType, isValidSubtype } from "./taxonomy.js";

/**
 * Regex for the @context tag format:
 *   @context:<type>[:<subtype>] [#id] [!priority] — <summary>
 *
 * Supports both em-dash (—) and double-dash (--) as separators.
 */
const CONTEXT_PATTERN =
  /^@context:(\w+)(?::(\w+))?\s*(?:#([\w-]+))?\s*(?:!(critical|high|low))?\s*(?:—|--)\s*(.+)$/;

/**
 * Patterns to strip comment delimiters from a line.
 * Ordered: try block-comment continuation first, then line comments.
 */
const COMMENT_STRIPPERS: Array<(line: string) => string | null> = [
  // Block comment continuation: " * text" or " */ text"
  (line) => {
    const m = line.match(/^\s*\*\/?(.*)$/);
    return m ? m[1].trim() : null;
  },
  // JSX comment: {/* text */}
  (line) => {
    const m = line.match(/^\s*\{\/\*\s*(.*?)\s*\*\/\}$/);
    return m ? m[1] : null;
  },
  // Block comment start: /* text or /** text
  (line) => {
    const m = line.match(/^\s*\/\*\*?\s*(.*?)(?:\s*\*\/)?$/);
    return m ? m[1].trim() : null;
  },
  // Line comment: // text
  (line) => {
    const m = line.match(/^\s*\/\/\s?(.*)$/);
    return m ? m[1].trim() : null;
  },
  // Hash comment: # text (Python, Ruby, Shell)
  (line) => {
    const m = line.match(/^\s*#\s?(.*)$/);
    return m ? m[1].trim() : null;
  },
  // Double-dash comment: -- text (SQL, Lua, Haskell)
  (line) => {
    const m = line.match(/^\s*--\s?(.*)$/);
    return m ? m[1].trim() : null;
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

/**
 * Strip comment delimiters from a line, returning the inner text.
 * Returns null if the line is not a comment.
 */
export function stripCommentDelimiters(line: string): string | null {
  for (const stripper of COMMENT_STRIPPERS) {
    const result = stripper(line);
    if (result !== null) return result;
  }
  return null;
}

/**
 * Parse all @context tags from a source file's text content.
 */
export function parseContextTags(
  source: string,
  filePath: string,
): ParseResult {
  const lines = source.split("\n");
  const tags: ContextTag[] = [];
  const errors: ParseError[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inner = stripCommentDelimiters(line);
    if (inner === null) continue;

    // Quick check: does this line contain @context: at all?
    if (!inner.includes("@context:")) continue;

    const match = inner.match(CONTEXT_PATTERN);
    if (!match) {
      // Line mentions @context: but doesn't match the pattern
      if (inner.startsWith("@context:")) {
        errors.push({
          message: `Malformed @context tag: "${inner}"`,
          location: { file: filePath, line: i + 1, column: 1 },
        });
      }
      continue;
    }

    const [, typeStr, subtypeStr, id, priorityStr, summary] = match;

    if (!isValidType(typeStr)) {
      errors.push({
        message: `Unknown context type: "${typeStr}"`,
        location: { file: filePath, line: i + 1, column: 1 },
      });
      continue;
    }

    if (subtypeStr && !isValidSubtype(typeStr, subtypeStr)) {
      errors.push({
        message: `Invalid subtype "${subtypeStr}" for type "${typeStr}"`,
        location: { file: filePath, line: i + 1, column: 1 },
      });
      continue;
    }

    const tag: ContextTag = {
      raw: line,
      type: typeStr,
      summary: summary.trim(),
      location: { file: filePath, line: i + 1, column: 1 },
    };

    if (subtypeStr) tag.subtype = subtypeStr as ContextTag["subtype"];
    if (id) tag.id = id;
    if (priorityStr) tag.priority = priorityStr as ContextTag["priority"];

    tags.push(tag);
  }

  return { tags, errors };
}
