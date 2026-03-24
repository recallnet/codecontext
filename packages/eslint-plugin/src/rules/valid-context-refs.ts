import fs from "node:fs";
import path from "node:path";

import type { Rule } from "eslint";

import { extractContextTags } from "../utils/comment-extractor.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Check that #references in @context comments resolve to existing local files",
    },
    messages: {
      missingCtxFile: "Context reference not found for #{{id}}. Looked for: {{expectedPath}}.",
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
    const looksLikePathReference = (value: string): boolean =>
      value.includes("/") || value.includes(".");

    const resolveCandidates = (value: string, cwd: string): string[] => {
      if (looksLikePathReference(value)) {
        return [path.resolve(cwd, value)];
      }

      return [
        path.resolve(cwd, value),
        path.resolve(cwd, contextDir, value),
        path.resolve(cwd, contextDir, `${value}.ctx.md`),
      ];
    };

    return {
      Program() {
        const tags = extractContextTags(context);

        const cwd = context.cwd;

        for (const tag of tags) {
          if (!tag.id) {
            continue;
          }

          const candidates = resolveCandidates(tag.id, cwd);
          const resolvedFile = candidates.find((candidate) => fs.existsSync(candidate));
          if (!resolvedFile) {
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "missingCtxFile",
              data: {
                id: tag.id,
                expectedPath: candidates
                  .map((candidate) => path.relative(cwd, candidate))
                  .join(", "),
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
