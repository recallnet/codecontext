import type { ContextTag, Priority } from "@recallnet/codecontext-parser";

/** Maximum tags to show before truncating. */
export const MAX_TAGS_IN_REMINDER = 6;

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  low: 3,
};

function priorityRank(p?: Priority): number {
  if (!p) return 2;
  // eslint-disable-next-line security/detect-object-injection
  return PRIORITY_ORDER[p] ?? 2;
}

/** Format a single tag as a compact one-liner for steering reminders. */
export function formatTagLabel(tag: ContextTag): string {
  const typeLabel = tag.subtype ? `${tag.type}:${tag.subtype}` : tag.type;
  const priority = tag.priority ? ` !${tag.priority}` : "";
  const ref = tag.id ? ` {@link ${tag.id}}` : "";
  return `L${String(tag.location.line)}  @context ${typeLabel}${priority}${ref} — ${tag.summary}`;
}

/** Check whether a ref target points to a Claude skill. */
export function isSkillRef(ref: string): boolean {
  return ref.includes(".claude/skills/") && ref.endsWith("SKILL.md");
}

/** Extract the skill invocation name from a skill file path. */
export function skillNameFromRef(ref: string): string | undefined {
  // .claude/skills/<name>/SKILL.md → <name>
  const match = /\.claude\/skills\/([^/]+)\/SKILL\.md/.exec(ref);
  return match?.[1];
}

export interface PriorityGroup {
  tier: "MUST-READ" | "WARNING" | "INFO";
  label: string;
  tags: ContextTag[];
}

/** Group tags by priority tier, sorted critical → high → normal → low. */
export function groupByPriority(tags: readonly ContextTag[]): PriorityGroup[] {
  const sorted = [...tags].sort((a, b) => priorityRank(a.priority) - priorityRank(b.priority));

  const critical = sorted.filter((t) => t.priority === "critical");
  const high = sorted.filter((t) => t.priority === "high");
  const rest = sorted.filter((t) => t.priority !== "critical" && t.priority !== "high");

  const groups: PriorityGroup[] = [];
  if (critical.length > 0) {
    groups.push({ tier: "MUST-READ", label: "MUST-READ (critical)", tags: critical });
  }
  if (high.length > 0) {
    groups.push({ tier: "WARNING", label: "WARNING (high)", tags: high });
  }
  if (rest.length > 0) {
    groups.push({ tier: "INFO", label: "INFO", tags: rest });
  }
  return groups;
}

/** Detect skill refs among tags and return skill load instructions. */
export function detectSkillRefs(tags: readonly ContextTag[]): string[] {
  const skills: string[] = [];
  for (const tag of tags) {
    if (tag.id && isSkillRef(tag.id)) {
      const name = skillNameFromRef(tag.id);
      if (name) {
        skills.push(`Load /${name} before editing the block at L${String(tag.location.line)}`);
      }
    }
  }
  return skills;
}

export interface FormatReminderOptions {
  /** File path to display (typically relative). */
  file: string;
  /** Tags to include in the reminder. */
  tags: readonly ContextTag[];
  /** Maximum tags to show before truncating. Defaults to MAX_TAGS_IN_REMINDER. */
  maxTags?: number;
}

/**
 * Format a compact, tiered steering reminder for a set of @context tags.
 * Designed for use in hooks, pi, and skill output.
 */
export function formatReminder(options: FormatReminderOptions): string {
  const { file, tags, maxTags = MAX_TAGS_IN_REMINDER } = options;
  if (tags.length === 0) return "";

  const lines: string[] = [`${String(tags.length)} @context annotation(s) in ${file}`, ""];

  // Skill ref warnings first
  const skillWarnings = detectSkillRefs(tags);
  if (skillWarnings.length > 0) {
    lines.push("── SKILL REQUIRED ──");
    for (const sw of skillWarnings) {
      lines.push(sw);
    }
    lines.push("");
  }

  // Priority-tiered tag display
  const groups = groupByPriority(tags);
  let shown = 0;

  for (const group of groups) {
    if (shown >= maxTags) break;
    lines.push(`── ${group.label} ──`);
    for (const tag of group.tags) {
      if (shown >= maxTags) {
        break;
      }
      lines.push(formatTagLabel(tag));
      shown++;
    }
    lines.push("");
  }

  const omitted = tags.length - shown;
  if (omitted > 0) {
    lines.push(`...and ${String(omitted)} more annotation(s).`);
    lines.push("");
  }

  lines.push("Review annotation intent and follow any {@link} refs before editing.");

  return lines.join("\n");
}
