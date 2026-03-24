import type { Rule } from "eslint";

/**
 * Regex for the @context tag format:
 *   @context:<type>[:<subtype>] [#id] [!priority] — <summary>
 *
 * Mirrors the pattern from @codecontext/parser.
 */
const CONTEXT_PATTERN =
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
  const m = line.match(/^\s*\*?\s?(.*)$/);
  return m ? m[1] : line;
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
    const startLine = comment.loc!.start.line;

    for (let i = 0; i < lines.length; i++) {
      const raw = stripBlockContinuation(lines[i]).trim();
      if (!raw.includes("@context:")) continue;

      const match = raw.match(CONTEXT_PATTERN);
      if (!match) continue;

      const [, type, subtype, id, priority, summary] = match;
      tags.push({
        raw,
        type,
        subtype: subtype || undefined,
        id: id || undefined,
        priority: priority || undefined,
        summary: summary.trim(),
        line: startLine + i,
        column: comment.loc!.start.column,
        comment,
      });
    }
  }

  return tags;
}
