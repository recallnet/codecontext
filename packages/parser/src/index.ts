// Core types
export type {
  ContextType,
  ContextSubtype,
  DecisionSubtype,
  RiskSubtype,
  Priority,
  StalenessStatus,
  SourceLocation,
  ContextTag,
  CtxFileFrontmatter,
  CtxFileSection,
  CtxFile,
  AnchoredContext,
  FileContext,
  ScopeBriefing,
} from "./types.js";

// Comment parser
export {
  isContextTagCandidate,
  parseContextTags,
  stripCommentDelimiters,
  type ParseResult,
  type ParseError,
} from "./comment-parser.js";

// .ctx.md file parser
export { parseCtxFile, CtxFileError } from "./ctx-file-parser.js";

// Taxonomy
export { TAXONOMY, isValidType, isValidSubtype, getValidSubtypes } from "./taxonomy.js";

// Staleness
export {
  computeStaleness,
  extractBlock,
  hashBlock,
  createEmptyCache,
  updateCache,
  type StalenessCache,
} from "./staleness.js";

// Utilities
export {
  findContextDir,
  loadCtxFileById,
  loadAllCtxFiles,
  resolveCtxFiles,
  loadCache,
  buildFileContext,
} from "./utils.js";
