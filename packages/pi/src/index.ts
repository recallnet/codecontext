import path from "node:path";

import { ReminderCooldown, formatReminder } from "@recallnet/codecontext-formatter";
import { parseContextTags } from "@recallnet/codecontext-parser";

interface PiTextPart {
  type: "text";
  text: string;
}

interface ToolResultInput {
  path?: string;
  file_path?: string;
  offset?: number;
  limit?: number;
}

interface ToolResultEvent {
  toolName: string;
  isError?: boolean;
  input?: ToolResultInput;
  content?: unknown;
}

interface PiUi {
  notify(message: string, level: "info" | "warn" | "error"): void;
}

interface PiContext {
  cwd: string;
  hasUI?: boolean;
  ui?: PiUi;
}

interface PiMessage {
  customType: "codecontext-steering";
  content: string;
  display: true;
  details: {
    file: string;
    annotations: number;
    parseErrors: number;
  };
}

interface PiHost {
  on(event: "tool_result", handler: (event: ToolResultEvent, ctx: PiContext) => void): void;
  sendMessage(message: PiMessage, options: { deliverAs: "steer" }): void;
}

function isTextPart(part: unknown): part is PiTextPart {
  return (
    typeof part === "object" &&
    part !== null &&
    "type" in part &&
    part.type === "text" &&
    "text" in part &&
    typeof part.text === "string"
  );
}

function getTextContent(content: unknown): string {
  if (!Array.isArray(content)) {
    return "";
  }

  return content
    .filter(isTextPart)
    .map((part) => part.text)
    .join("\n");
}

export default function codecontextSteeringExtension(pi: PiHost): void {
  const cooldown = new ReminderCooldown();

  pi.on("tool_result", (event, ctx) => {
    if (event.toolName !== "read" || event.isError === true) {
      return;
    }

    const input = event.input ?? {};
    const relativePath = input.path ?? input.file_path;
    if (!relativePath) {
      return;
    }

    const text = getTextContent(event.content);
    if (!text) {
      return;
    }

    const absolutePath = path.resolve(ctx.cwd, relativePath);
    const parse = parseContextTags(text, absolutePath);
    if (parse.tags.length === 0) {
      return;
    }

    const offset = input.offset ?? 1;
    const snippetKey = ReminderCooldown.readKey(absolutePath, offset, input.limit);
    if (!cooldown.shouldRemind(snippetKey)) {
      return;
    }

    const lineShift = Math.max(offset - 1, 0);
    const adjustedTags = parse.tags.map((tag) => ({
      ...tag,
      location: { ...tag.location, line: tag.location.line + lineShift },
    }));

    const reminder = formatReminder({
      file: relativePath,
      tags: adjustedTags,
    });

    pi.sendMessage(
      {
        customType: "codecontext-steering",
        content: reminder,
        display: true,
        details: {
          file: relativePath,
          annotations: adjustedTags.length,
          parseErrors: parse.errors.length,
        },
      },
      { deliverAs: "steer" }
    );

    if (ctx.hasUI && ctx.ui) {
      ctx.ui.notify(
        `codecontext: ${String(adjustedTags.length)} @context tag(s) detected in ${relativePath}`,
        "info"
      );
    }
  });
}
