import { buildFileContext, type FileContext } from "@recallnet/codecontext-parser";
import type { Rule } from "eslint";

type DetailedAnchored = FileContext["anchored"][number] & {
  verifiedDate?: string;
  reason?: string;
};

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Error when @context verification dates are too old or when annotated code changes without a verification-date bump",
    },
    messages: {
      verificationDateExpired:
        "@context verification date {{date}} is {{ageDays}} days old (threshold: {{maxAgeDays}} days). Update the date or remove the stale context.",
      codeChangedWithoutDateBump:
        "@context code changed since the last verification, but the verification date was not advanced. Update [verified:YYYY-MM-DD] or remove the context.",
      missingVerificationDate:
        "@context code changed since the last verification and this annotation has no verification date. Add [verified:YYYY-MM-DD] or remove the context.",
    },
    schema: [
      {
        type: "object",
        properties: {
          maxAgeDays: {
            type: "integer",
            description: "Maximum allowed age for an explicit verification date",
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
        const ctx = buildFileContext(context.filename, { maxAgeDays });

        for (const anchored of ctx.anchored) {
          const detailedAnchored = anchored as DetailedAnchored;

          switch (detailedAnchored.reason) {
            case "verification-date-expired": {
              const verifiedDate = detailedAnchored.verifiedDate;
              if (!verifiedDate) {
                continue;
              }

              const ageDays = Math.floor(
                (Date.now() - new Date(`${verifiedDate}T00:00:00.000Z`).getTime()) /
                  (1000 * 60 * 60 * 24)
              );
              context.report({
                loc: {
                  line: anchored.tag.location.line,
                  column: anchored.tag.location.column,
                },
                messageId: "verificationDateExpired",
                data: {
                  date: verifiedDate,
                  ageDays: String(ageDays),
                  maxAgeDays: String(maxAgeDays),
                },
              });
              break;
            }
            case "code-changed-without-date-bump":
              context.report({
                loc: {
                  line: anchored.tag.location.line,
                  column: anchored.tag.location.column,
                },
                messageId: "codeChangedWithoutDateBump",
              });
              break;
            case "missing-verification-date":
              context.report({
                loc: {
                  line: anchored.tag.location.line,
                  column: anchored.tag.location.column,
                },
                messageId: "missingVerificationDate",
              });
              break;
            default:
              break;
          }
        }
      },
    };
  },
};

export default rule;
