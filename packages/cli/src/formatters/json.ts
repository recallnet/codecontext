import type { FileContext } from "@recallnet/codecontext-parser";

type FileContextTag = FileContext["tags"][number] & { verified?: string };
type FileAnchored = FileContext["anchored"][number] & { verifiedDate?: string; reason?: string };

/**
 * Format a FileContext as JSON for agent/tool consumption.
 * This is designed for consumption by AI agents and tooling.
 */
export function formatFileContextJson(ctx: FileContext): string {
  const output = {
    file: ctx.file,
    tags: ctx.tags.map((tag) => {
      const datedTag = tag as FileContextTag;
      return {
        type: tag.type,
        subtype: tag.subtype ?? null,
        id: tag.id ?? null,
        priority: tag.priority ?? null,
        verified: datedTag.verified ?? null,
        summary: tag.summary,
        location: tag.location,
        raw: tag.raw,
      };
    }),
    anchored: ctx.anchored.map((a) => {
      const detailedAnchored = a as FileAnchored;
      return {
        tag: {
          type: a.tag.type,
          subtype: a.tag.subtype ?? null,
          id: a.tag.id ?? null,
          priority: a.tag.priority ?? null,
          summary: a.tag.summary,
          location: a.tag.location,
        },
        blockHash: a.blockHash,
        status: a.status,
        verifiedAt: a.verifiedAt ?? null,
        verifiedDate: detailedAnchored.verifiedDate ?? null,
        reason: a.reason,
      };
    }),
  };

  return JSON.stringify(output, null, 2);
}
