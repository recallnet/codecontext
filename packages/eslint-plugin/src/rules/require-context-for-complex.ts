import type { Rule } from "eslint";
import type { Node } from "estree";

const CONTEXT_MARKER = /@context:/;

const rule: Rule.RuleModule = {
  meta: {
    type: "suggestion",
    docs: {
      description:
        "Warn when functions exceed a cyclomatic complexity threshold without @context annotations",
    },
    messages: {
      missingContext:
        "Function has cyclomatic complexity of {{complexity}} (threshold: {{threshold}}) but no @context annotation.",
    },
    schema: [
      {
        type: "object",
        properties: {
          complexityThreshold: {
            type: "integer",
            description: "Cyclomatic complexity threshold above which @context is required",
          },
        },
        additionalProperties: false,
      },
    ],
  },

  create(context) {
    const options = (context.options[0] as { complexityThreshold?: number } | undefined) ?? {};
    const threshold = options.complexityThreshold ?? 5;

    function checkFunction(node: Node & Rule.NodeParentExtension) {
      // Count cyclomatic complexity by walking the function body
      let complexity = 1; // Base complexity

      function walk(n: Node) {
        switch (n.type) {
          case "IfStatement":
          case "ConditionalExpression":
          case "ForStatement":
          case "ForInStatement":
          case "ForOfStatement":
          case "WhileStatement":
          case "DoWhileStatement":
            complexity++;
            break;
          case "SwitchCase":
            // Don't count the default case
            if ((n as any).test !== null) {
              complexity++;
            }
            break;
          case "CatchClause":
            complexity++;
            break;
          case "LogicalExpression":
            if (
              (n as any).operator === "&&" ||
              (n as any).operator === "||" ||
              (n as any).operator === "??"
            ) {
              complexity++;
            }
            break;
        }

        // Walk children (but don't descend into nested functions)
        for (const key of Object.keys(n)) {
          if (key === "parent") continue;
          const child = (n as any)[key];
          if (child && typeof child === "object") {
            if (Array.isArray(child)) {
              for (const item of child) {
                if (item && typeof item.type === "string" && !isFunctionNode(item)) {
                  walk(item);
                }
              }
            } else if (typeof child.type === "string" && !isFunctionNode(child)) {
              walk(child);
            }
          }
        }
      }

      function isFunctionNode(n: Node): boolean {
        return (
          n.type === "FunctionDeclaration" ||
          n.type === "FunctionExpression" ||
          n.type === "ArrowFunctionExpression"
        );
      }

      // Walk the function body
      const body =
        node.type === "ArrowFunctionExpression"
          ? node.body
          : (node as any).body;

      if (body) {
        walk(body);
      }

      if (complexity <= threshold) return;

      // Check if leading comments contain @context
      const sourceCode = context.sourceCode;
      const comments = sourceCode.getCommentsBefore(node);
      const hasContext = comments.some((c) => CONTEXT_MARKER.test(c.value));

      if (hasContext) return;

      // Also check comments inside the function at the top (first statement)
      if (body && body.type === "BlockStatement" && body.body.length > 0) {
        const firstStatement = body.body[0];
        const innerComments = sourceCode.getCommentsBefore(firstStatement);
        const hasInnerContext = innerComments.some((c) => CONTEXT_MARKER.test(c.value));
        if (hasInnerContext) return;
      }

      context.report({
        node,
        messageId: "missingContext",
        data: {
          complexity: String(complexity),
          threshold: String(threshold),
        },
      });
    }

    return {
      FunctionDeclaration: checkFunction,
      FunctionExpression: checkFunction,
      ArrowFunctionExpression: checkFunction,
    };
  },
};

export default rule;
