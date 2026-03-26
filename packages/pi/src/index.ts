import path from "node:path";

import { parseContextTags, type ContextTag } from "@recallnet/codecontext-parser";

const MAX_TAGS_IN_MESSAGE = 6;
const REMINDER_COOLDOWN_MS = 20_000;

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

function formatTagLabel(tag: ContextTag): string {
  const typeLabel = tag.subtype ? `${tag.type}:${tag.subtype}` : tag.type;
  const priority = tag.priority ? ` !${tag.priority}` : "";
  const ref = tag.id ? ` {@link ${tag.id}}` : "";
  return `- L${String(tag.location.line)} @context ${typeLabel}${priority}${ref} — ${tag.summary}`;
}

export default function codecontextSteeringExtension(pi: PiHost): void {
  const lastReminderBySnippet = new Map<string, number>();

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
    const limitKey = input.limit === undefined ? "all" : String(input.limit);
    const snippetKey = `${absolutePath}:${String(offset)}:${limitKey}`;
    const now = Date.now();
    const lastReminderAt = lastReminderBySnippet.get(snippetKey) ?? 0;
    if (now - lastReminderAt < REMINDER_COOLDOWN_MS) {
      return;
    }
    lastReminderBySnippet.set(snippetKey, now);

    const lineShift = Math.max(offset - 1, 0);
    const adjustedTags: ContextTag[] = parse.tags.map((tag) => ({
      ...tag,
      location: { ...tag.location, line: tag.location.line + lineShift },
    }));

    const shown = adjustedTags.slice(0, MAX_TAGS_IN_MESSAGE);
    const omittedCount = adjustedTags.length - shown.length;

    const reminder = [
      `Detected ${String(adjustedTags.length)} @context annotation(s) in ${relativePath}.`,
      "Before changing this area, review the annotation intent and follow any {@link ...} refs that affect your edit.",
      "",
      ...shown.map(formatTagLabel),
      omittedCount > 0 ? `- ...and ${String(omittedCount)} more tag(s) in this read snippet.` : "",
    ]
      .filter(Boolean)
      .join("\n");

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
