import type { CtxFile, FileContext } from "@recallnet/codecontext-parser";

interface SerializedCtxFile {
  id: string;
  type: string;
  status: string;
  verified: string;
  owners: string[];
  traces: string[];
  body: string;
  filePath: string;
}

type FileContextTag = FileContext["tags"][number] & { verified?: string };
type FileAnchored = FileContext["anchored"][number] & {
  verifiedDate?: string;
  reason?: string;
};

function serializeCtxFile(ctxFile: CtxFile): SerializedCtxFile {
  return {
    id: ctxFile.frontmatter.id,
    type: ctxFile.frontmatter.type,
    status: ctxFile.frontmatter.status,
    verified: ctxFile.frontmatter.verified,
    owners: ctxFile.frontmatter.owners,
    traces: ctxFile.frontmatter.traces,
    body: ctxFile.body,
    filePath: ctxFile.filePath,
  };
}

/**
 * Format a FileContext as JSON with .ctx.md content inlined.
 * This is designed for consumption by AI agents and tooling.
 */
export function formatFileContextJson(ctx: FileContext): string {
  const resolvedCtxFiles: Record<string, SerializedCtxFile> = {};
  for (const [id, ctxFile] of ctx.resolvedCtxFiles) {
    // eslint-disable-next-line security/detect-object-injection
    resolvedCtxFiles[id] = serializeCtxFile(ctxFile);
  }

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
    resolvedCtxFiles,
  };

  return JSON.stringify(output, null, 2);
}
