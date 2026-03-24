import { isContextTagCandidate } from "@recallnet/codecontext-parser";
import type { Rule } from "eslint";
import type { Node } from "estree";

/**
 * Check if a node is a function node (to avoid descending into nested functions).
 */
function isFunctionNode(n: Node): boolean {
  return (
    n.type === "FunctionDeclaration" ||
    n.type === "FunctionExpression" ||
    n.type === "ArrowFunctionExpression"
  );
}

/**
 * Check if a node type contributes to cyclomatic complexity.
 */
function getComplexityIncrease(n: Node): number {
  switch (n.type) {
    case "IfStatement":
    case "ConditionalExpression":
    case "ForStatement":
    case "ForInStatement":
    case "ForOfStatement":
    case "WhileStatement":
    case "DoWhileStatement":
    case "CatchClause":
      return 1;
    case "SwitchCase": {
      const switchCase = n as Node & { test?: unknown };
      return switchCase.test !== null && switchCase.test !== undefined ? 1 : 0;
    }
    case "LogicalExpression": {
      const logicalExpr = n as Node & { operator?: string };
      const op = logicalExpr.operator;
      return op === "&&" || op === "||" || op === "??" ? 1 : 0;
    }
    default:
      return 0;
  }
}

function isNodeLike(value: unknown): value is Node {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof (value as Node).type === "string"
  );
}

function isWalkableNode(value: unknown): value is Node {
  return isNodeLike(value) && !isFunctionNode(value);
}

function getChildComplexity(child: unknown): number {
  if (!child || typeof child !== "object") {
    return 0;
  }
  if (Array.isArray(child)) {
    let sum = 0;
    for (const item of child) {
      if (isWalkableNode(item)) {
        sum += computeComplexity(item);
      }
    }
    return sum;
  }
  if (isWalkableNode(child)) {
    return computeComplexity(child);
  }
  return 0;
}

/**
 * Walk the AST and compute cyclomatic complexity, skipping nested function nodes.
 */
function computeComplexity(node: Node): number {
  let complexity = getComplexityIncrease(node);

  for (const key of Object.keys(node)) {
    if (key === "parent") {
      continue;
    }
    // eslint-disable-next-line security/detect-object-injection
    const child = (node as unknown as Record<string, unknown>)[key];
    complexity += getChildComplexity(child);
  }

  return complexity;
}

function hasContextInComments(sourceCode: Rule.RuleContext["sourceCode"], node: Node): boolean {
  const comments = sourceCode.getCommentsBefore(node);
  return comments.some((c) =>
    c.value
      .split("\n")
      .map((line) => line.trim())
      .some((line) => isContextTagCandidate(line))
  );
}

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
      const body =
        node.type === "ArrowFunctionExpression"
          ? (node as unknown as { body: Node }).body
          : (node as unknown as { body?: Node }).body;

      if (!body) {
        return;
      }

      const complexity = 1 + computeComplexity(body);
      if (complexity <= threshold) {
        return;
      }

      if (hasContextInComments(context.sourceCode, node)) {
        return;
      }

      // Also check comments inside the function at the top (first statement)
      const blockBody = body as Node & { body?: Node[] };
      if (body.type === "BlockStatement" && blockBody.body && blockBody.body.length > 0) {
        const firstStatement = blockBody.body[0];
        if (firstStatement && hasContextInComments(context.sourceCode, firstStatement)) {
          return;
        }
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
