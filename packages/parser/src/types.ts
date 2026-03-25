// --- Context tag types ---

export type ContextType = "decision" | "requirement" | "risk" | "related" | "history" | "doc";

export type DecisionSubtype = "tradeoff" | "constraint" | "assumption";
export type RiskSubtype = "perf" | "security" | "compat";
export type ContextSubtype = DecisionSubtype | RiskSubtype;

export type Priority = "critical" | "high" | "low";

export type StalenessStatus = "verified" | "stale" | "review-required";
export type StalenessReason =
  | "fresh"
  | "date-bumped"
  | "missing-verification-date"
  | "code-changed-without-date-bump"
  | "verification-date-expired";

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface ContextTag {
  /** The full raw text of the comment line */
  raw: string;
  /** Primary context type */
  type: ContextType;
  /** Optional subtype (e.g., decision:tradeoff) */
  subtype?: ContextSubtype;
  /** Optional reference to supporting docs or code */
  id?: string;
  /** Priority level */
  priority?: Priority;
  /** Optional verification date in YYYY-MM-DD format */
  verified?: string;
  /** The summary text after the em-dash */
  summary: string;
  /** Source location */
  location: SourceLocation;
}

export interface AnchoredContext {
  tag: ContextTag;
  /** Hash of the logical code block the tag annotates */
  blockHash: string;
  /** Staleness status */
  status: StalenessStatus;
  /** ISO date of last verification, if known */
  verifiedAt?: string;
  /** Verification date declared directly on the tag */
  verifiedDate?: string;
  /** Why the current status was assigned */
  reason: StalenessReason;
}

export interface FileContext {
  file: string;
  tags: ContextTag[];
  anchored: AnchoredContext[];
}

export interface ScopeBriefing {
  file: string;
  /** All entries sorted by priority (critical first) */
  entries: {
    tag: ContextTag;
    status: StalenessStatus;
  }[];
}
