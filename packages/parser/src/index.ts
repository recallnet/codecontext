// Core types
export type {
  ContextType,
  ContextSubtype,
  DecisionSubtype,
  RiskSubtype,
  Priority,
  StalenessStatus,
  StalenessReason,
  SourceLocation,
  ContextTag,
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

// Taxonomy
export { TAXONOMY, isValidType, isValidSubtype, getValidSubtypes } from "./taxonomy.js";

// Staleness
export {
  computeStaleness,
  extractBlock,
  hashBlock,
  createEmptyCache,
  updateCache,
  type StalenessOptions,
  type StalenessCache,
} from "./staleness.js";

// Utilities
export {
  findContextDir,
  findProjectRoot,
  loadCache,
  saveCache,
  buildFileContext,
} from "./utils.js";
