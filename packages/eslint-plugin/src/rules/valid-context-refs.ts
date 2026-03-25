import fs from "node:fs";
import path from "node:path";

import type { Rule } from "eslint";

import { extractContextTags } from "../utils/comment-extractor.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Check that local {@link ...} references in @context comments resolve to existing files",
    },
    messages: {
      missingReference:
        "Context reference not found for {@link {{id}}}. Looked for: {{expectedPath}}.",
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
    const isRemoteReference = (value: string): boolean =>
      value.startsWith("http://") || value.startsWith("https://");
    const normalizeLocalReference = (value: string): string =>
      value.startsWith("file:") ? value.slice("file:".length) : value;
    const looksLikePathReference = (value: string): boolean =>
      value.includes("/") || value.includes(".");

    const resolveCandidates = (value: string, cwd: string): string[] => {
      const normalized = normalizeLocalReference(value);

      if (looksLikePathReference(normalized)) {
        return [path.resolve(cwd, normalized)];
      }

      return [path.resolve(cwd, normalized), path.resolve(cwd, contextDir, normalized)];
    };

    return {
      Program() {
        const tags = extractContextTags(context);

        const cwd = context.cwd;

        for (const tag of tags) {
          if (!tag.id || isRemoteReference(tag.id)) {
            continue;
          }

          const candidates = resolveCandidates(tag.id, cwd);
          const resolvedFile = candidates.find((candidate) => fs.existsSync(candidate));
          if (!resolvedFile) {
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "missingReference",
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
