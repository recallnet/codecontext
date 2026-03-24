import type {
  FileContext,
  ScopeBriefing,
  AnchoredContext,
  ContextTag,
  StalenessStatus,
  Priority,
} from "@codecontext/parser";

// ANSI escape codes
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";
const WHITE = "\x1b[37m";

const TYPE_COLORS: Record<string, string> = {
  decision: MAGENTA,
  requirement: BLUE,
  risk: RED,
  related: CYAN,
  history: DIM,
  doc: GREEN,
};

function colorType(type: string, subtype?: string): string {
  const color = TYPE_COLORS[type] ?? WHITE;
  const label = subtype ? `${type}:${subtype}` : type;
  return `${color}${BOLD}@context(${label})${RESET}`;
}

function colorPriority(priority?: Priority): string {
  if (!priority) return "";
  switch (priority) {
    case "critical":
      return ` ${RED}${BOLD}[CRITICAL]${RESET}`;
    case "high":
      return ` ${YELLOW}[HIGH]${RESET}`;
    case "low":
      return ` ${DIM}[low]${RESET}`;
  }
}

function colorStatus(status: StalenessStatus): string {
  switch (status) {
    case "verified":
      return `${GREEN}verified${RESET}`;
    case "stale":
      return `${RED}${BOLD}STALE${RESET}`;
    case "review-required":
      return `${YELLOW}review-required${RESET}`;
  }
}

function formatTag(tag: ContextTag, status?: StalenessStatus): string {
  const parts: string[] = [];
  parts.push(`  ${colorType(tag.type, tag.subtype)}${colorPriority(tag.priority)}`);
  if (status) {
    parts[0] += `  ${DIM}(${colorStatus(status)}${DIM})${RESET}`;
  }
  parts.push(`    ${tag.summary}`);
  parts.push(`    ${DIM}at line ${tag.location.line}${tag.id ? ` | ref: #${tag.id}` : ""}${RESET}`);
  return parts.join("\n");
}

function stalenessCounter(anchored: AnchoredContext[]): string {
  const verified = anchored.filter((a) => a.status === "verified").length;
  const stale = anchored.filter((a) => a.status === "stale").length;
  const review = anchored.filter((a) => a.status === "review-required").length;

  const parts: string[] = [];
  if (verified > 0) parts.push(`${GREEN}${verified} verified${RESET}`);
  if (stale > 0) parts.push(`${RED}${stale} stale${RESET}`);
  if (review > 0) parts.push(`${YELLOW}${review} review-required${RESET}`);

  return parts.length > 0 ? parts.join(", ") : `${DIM}no staleness data${RESET}`;
}

/**
 * Format a FileContext for human-readable terminal output.
 */
export function formatFileContext(ctx: FileContext): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${CYAN}${ctx.file}${RESET}`);
  lines.push(`${DIM}${ctx.tags.length} context entries | ${stalenessCounter(ctx.anchored)}${RESET}`);
  lines.push("");

  // Build a lookup for staleness by line
  const statusByLine = new Map<number, StalenessStatus>();
  for (const a of ctx.anchored) {
    statusByLine.set(a.tag.location.line, a.status);
  }

  for (const tag of ctx.tags) {
    const status = statusByLine.get(tag.location.line);
    lines.push(formatTag(tag, status));
    lines.push("");
  }

  // Show referenced .ctx.md files
  if (ctx.resolvedCtxFiles.size > 0) {
    lines.push(`${DIM}${"─".repeat(40)}${RESET}`);
    lines.push(`${BOLD}Referenced .ctx.md files:${RESET}`);
    for (const [id, ctxFile] of ctx.resolvedCtxFiles) {
      lines.push(`  ${CYAN}#${id}${RESET} ${DIM}→ ${ctxFile.filePath}${RESET}`);
      lines.push(`    ${DIM}status: ${ctxFile.frontmatter.status} | owners: ${ctxFile.frontmatter.owners.join(", ")}${RESET}`);
    }
  }

  return lines.join("\n");
}

/**
 * Format a ScopeBriefing for human-readable terminal output.
 */
export function formatScopeBriefing(briefing: ScopeBriefing): string {
  const lines: string[] = [];

  lines.push(`${BOLD}${CYAN}Scope Briefing: ${briefing.file}${RESET}`);
  lines.push(`${DIM}${briefing.entries.length} entries, sorted by priority${RESET}`);
  lines.push("");

  for (const entry of briefing.entries) {
    const statusStr = colorStatus(entry.status);
    lines.push(`  ${colorType(entry.tag.type, entry.tag.subtype)}${colorPriority(entry.tag.priority)}  ${DIM}(${statusStr}${DIM})${RESET}`);
    lines.push(`    ${entry.tag.summary}`);
    if (entry.ctxFile) {
      lines.push(`    ${DIM}→ #${entry.tag.id}: ${entry.ctxFile.frontmatter.status}${RESET}`);
    }
    lines.push("");
  }

  return lines.join("\n");
}
