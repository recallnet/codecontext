import type { Rule } from "eslint";
import { extractContextTags } from "../utils/comment-extractor.js";
import fs from "node:fs";
import path from "node:path";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Check that #id references in @context comments resolve to .ctx.md files",
    },
    messages: {
      missingCtxFile:
        'Context file not found for #{{id}}. Expected: {{expectedPath}}.',
    },
    schema: [
      {
        type: "object",
        properties: {
          contextDir: {
            type: "string",
            description: "Path to the context directory relative to the project root",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as { contextDir?: string } | undefined) ?? {};
    const contextDir = options.contextDir ?? "docs/context";

    return {
      Program() {
        const tags = extractContextTags(context);

        // Resolve the context directory relative to the current working directory
        const cwd = context.cwd ?? process.cwd();
        const resolvedContextDir = path.resolve(cwd, contextDir);

        for (const tag of tags) {
          if (!tag.id) continue;

          const expectedFile = path.join(resolvedContextDir, `${tag.id}.ctx.md`);
          if (!fs.existsSync(expectedFile)) {
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "missingCtxFile",
              data: {
                id: tag.id,
                expectedPath: path.relative(cwd, expectedFile),
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
