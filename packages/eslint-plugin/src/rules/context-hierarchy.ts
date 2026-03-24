import type { Rule } from "eslint";
import { isValidType, isValidSubtype, getValidSubtypes } from "@codecontext/parser";
import type { ContextType } from "@codecontext/parser";
import { extractContextTags } from "../utils/comment-extractor.js";

const rule: Rule.RuleModule = {
  meta: {
    type: "problem",
    docs: {
      description: "Validate @context type/subtype combinations against the taxonomy",
    },
    messages: {
      unknownType:
        'Unknown @context type "{{type}}". Valid types: {{validTypes}}.',
      invalidSubtype:
        'Invalid subtype "{{subtype}}" for type "{{type}}". Valid subtypes: {{validSubtypes}}.',
    },
    schema: [],
  },

  create(context) {
    return {
      Program() {
        const tags = extractContextTags(context);

        for (const tag of tags) {
          if (!isValidType(tag.type)) {
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "unknownType",
              data: {
                type: tag.type,
                validTypes: "decision, requirement, risk, related, history, doc",
              },
            });
            continue;
          }

          if (tag.subtype && !isValidSubtype(tag.type as ContextType, tag.subtype)) {
            const validSubs = getValidSubtypes(tag.type as ContextType);
            context.report({
              loc: { line: tag.line, column: tag.column },
              messageId: "invalidSubtype",
              data: {
                subtype: tag.subtype,
                type: tag.type,
                validSubtypes: validSubs.length > 0 ? validSubs.join(", ") : "(none)",
              },
            });
          }
        }
      },
    };
  },
};

export default rule;
