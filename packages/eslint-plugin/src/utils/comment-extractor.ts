import type { Rule } from "eslint";

/**
 * Regex for the @context tag format:
 *   @context:<type>[:<subtype>] [#id] [!priority] — <summary>
 *
 * Mirrors the pattern from @recallnet/codecontext-parser.
 */
const CONTEXT_PATTERN =
  // eslint-disable-next-line security/detect-unsafe-regex
  /^@context:(\w+)(?::(\w+))?\s*(?:#([\w-]+))?\s*(?:!(critical|high|low))?\s*(?:—|--)\s*(.+)$/;

export interface ExtractedTag {
  raw: string;
  type: string;
  subtype?: string;
  id?: string;
  priority?: string;
  summary: string;
  line: number;
  column: number;
  comment: ReturnType<Rule.RuleContext["sourceCode"]["getAllComments"]>[number];
}

/**
 * Strip comment delimiters from a single line of a comment value.
 * ESLint's comment AST nodes already strip leading // or /* but
 * block comments may contain continuation lines with leading ` * `.
 */
function stripBlockContinuation(line: string): string {
  const m = /^\s*\*?\s?(.*)$/.exec(line);
  return m ? (m[1] ?? line) : line;
}

function parseTag(
  raw: string
): { type: string; subtype?: string; id?: string; priority?: string; summary: string } | null {
  const match = CONTEXT_PATTERN.exec(raw);
  if (!match) {
    return null;
  }

  const [, type, subtype, id, priority, summary] = match;
  if (!type || !summary) {
    return null;
  }

  const result: {
    type: string;
    subtype?: string;
    id?: string;
    priority?: string;
    summary: string;
  } = {
    type,
    summary: summary.trim(),
  };
  if (subtype) {
    result.subtype = subtype;
  }
  if (id) {
    result.id = id;
  }
  if (priority) {
    result.priority = priority;
  }
  return result;
}

/**
 * Extract all @context tags from every comment in the source file.
 */
export function extractContextTags(context: Rule.RuleContext): ExtractedTag[] {
  const sourceCode = context.sourceCode;
  const comments = sourceCode.getAllComments();
  const tags: ExtractedTag[] = [];

  for (const comment of comments) {
    const lines = comment.value.split("\n");
    const commentLoc = comment.loc;
    const startLine = commentLoc ? commentLoc.start.line : 1;
    const startColumn = commentLoc ? commentLoc.start.column : 0;

    for (let i = 0; i < lines.length; i++) {
      // eslint-disable-next-line security/detect-object-injection
      const raw = stripBlockContinuation(lines[i] ?? "").trim();
      if (!raw.includes("@context:")) {
        continue;
      }

      const parsed = parseTag(raw);
      if (!parsed) {
        continue;
      }

      tags.push({
        raw,
        ...parsed,
        line: startLine + i,
        column: startColumn,
        comment,
      });
    }
  }

  return tags;
}
