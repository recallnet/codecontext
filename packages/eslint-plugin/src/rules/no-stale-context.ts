import type { Rule } from "eslint";

import { extractContextTags } from "../utils/comment-extractor.js";

/**
 * Matches a date in YYYY-MM-DD format within a @context history tag summary.
 */
const DATE_PATTERN = /(\d{4}-\d{2}-\d{2})/;

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn when @context history tags reference dates older than a configurable threshold",
    },
    messages: {
      staleContext:
        "@context history references date {{date}}, which is {{ageDays}} days old (threshold: {{maxAgeDays}} days).",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxAgeDays: {
            type: "integer",
            description: "Maximum age in days before a history context is considered stale",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as { maxAgeDays?: number } | undefined) ?? {};
    const maxAgeDays = options.maxAgeDays ?? 90;

    return {
      Program() {
        const tags = extractContextTags(context);
        const now = Date.now();

        for (const tag of tags) {
          if (tag.type !== "history") {
            continue;
          }

          const dateMatch = DATE_PATTERN.exec(tag.summary) ?? DATE_PATTERN.exec(tag.raw);
          if (!dateMatch) {
            continue;
          }

          const dateStr = dateMatch[1] ?? "";
          const tagDate = new Date(dateStr);
          if (isNaN(tagDate.getTime())) {
            continue;
          }

          const ageDays = Math.floor((now - tagDate.getTime()) / (1000 * 60 * 60 * 24));
          if (ageDays > maxAgeDays) {
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "staleContext",
              data: {
                date: dateStr,
                ageDays: String(ageDays),
                maxAgeDays: String(maxAgeDays),
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
