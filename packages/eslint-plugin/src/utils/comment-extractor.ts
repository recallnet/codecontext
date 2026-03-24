import {
  TSDocConfiguration,
  TSDocParser,
  TSDocTagDefinition,
  TSDocTagSyntaxKind,
} from "@microsoft/tsdoc";
import {
  isContextTagCandidate,
  parseContextTags,
  type ContextTag,
} from "@recallnet/codecontext-parser";
import type { Rule } from "eslint";

const tsdocConfiguration = new TSDocConfiguration();
const contextBlockTag = new TSDocTagDefinition({
  tagName: "@context",
  syntaxKind: TSDocTagSyntaxKind.BlockTag,
  allowMultiple: true,
});

tsdocConfiguration.addTagDefinition(contextBlockTag);
tsdocConfiguration.setSupportForTag(contextBlockTag, true);

const tsdocParser = new TSDocParser(tsdocConfiguration);

export interface ExtractedTag extends Omit<ContextTag, "location"> {
  line: number;
  column: number;
  comment: ReturnType<Rule.RuleContext["sourceCode"]["getAllComments"]>[number];
}

type ParsedComment = ExtractedTag["comment"] & {
  loc: NonNullable<ExtractedTag["comment"]["loc"]>;
  range: NonNullable<ExtractedTag["comment"]["range"]>;
};

function hasTSDocContextBlock(rawComment: string): boolean {
  if (!rawComment.startsWith("/**")) {
    return false;
  }

  const parserContext = tsdocParser.parseString(rawComment);
  return parserContext.docComment.customBlocks.some(
    (block) => block.blockTag.tagName === "@context"
  );
}

function shouldParseComment(comment: ParsedComment, rawComment: string): boolean {
  if (!rawComment.includes("@context")) {
    return false;
  }

  if (comment.type !== "Block" || !rawComment.startsWith("/**")) {
    return true;
  }

  if (hasTSDocContextBlock(rawComment)) {
    return true;
  }

  return rawComment.split("\n").some((line) => isContextTagCandidate(line));
}

function mapParsedTag(comment: ParsedComment, tag: ContextTag): ExtractedTag {
  const extracted: ExtractedTag = {
    raw: tag.raw,
    type: tag.type,
    summary: tag.summary,
    line: comment.loc.start.line + tag.location.line - 1,
    column: tag.location.line === 1 ? comment.loc.start.column : 0,
    comment,
  };

  if (tag.subtype) {
    extracted.subtype = tag.subtype;
  }
  if (tag.id) {
    extracted.id = tag.id;
  }
  if (tag.priority) {
    extracted.priority = tag.priority;
  }

  return extracted;
}

/**
 * Extract all @context tags from every comment in the source file.
 *
 * For TSDoc comments we first ask the official TSDoc parser whether this
 * docblock contains an @context block tag. The shared codecontext parser
 * then parses the payload so line comments and non-TSDoc comments still
 * follow the same grammar.
 */
export function extractContextTags(context: Rule.RuleContext): ExtractedTag[] {
  const sourceCode = context.sourceCode;
  const comments = sourceCode.getAllComments();
  const filePath = context.filename;
  const tags: ExtractedTag[] = [];

  for (const comment of comments) {
    if (!comment.loc || !comment.range) {
      continue;
    }
    const parsedComment = comment as ParsedComment;

    const rawComment = sourceCode.text.slice(parsedComment.range[0], parsedComment.range[1]);
    if (!shouldParseComment(parsedComment, rawComment)) {
      continue;
    }

    const parsed = parseContextTags(rawComment, filePath);
    for (const tag of parsed.tags) {
      tags.push(mapParsedTag(parsedComment, tag));
    }
  }

  return tags;
}
