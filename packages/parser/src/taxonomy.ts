import type { ContextType, ContextSubtype } from "./types.js";

export interface TaxonomyEntry {
  description: string;
  subtypes: Record<string, string>;
}

export const TAXONOMY: Record<ContextType, TaxonomyEntry> = {
  decision: {
    description: "A design or implementation choice was made",
    subtypes: {
      tradeoff: "Chose approach A over B with known tradeoffs",
      constraint: "Forced into this approach by an external constraint",
      assumption: "This code assumes something that may not always hold",
    },
  },
  requirement: {
    description: "Traces to an external requirement",
    subtypes: {},
  },
  risk: {
    description: "Flags something fragile or dangerous",
    subtypes: {
      perf: "Performance-sensitive code",
      security: "Security-sensitive code",
      compat: "Compatibility constraint",
    },
  },
  related: {
    description: "Cross-reference to related code or docs",
    subtypes: {},
  },
  history: {
    description: "Records why something changed from a previous state",
    subtypes: {},
  },
  doc: {
    description: "Points to an extended writeup elsewhere",
    subtypes: {},
  },
};

const VALID_TYPES = new Set<string>(Object.keys(TAXONOMY));

const VALID_SUBTYPES = new Map<string, Set<string>>();
for (const [type, entry] of Object.entries(TAXONOMY)) {
  VALID_SUBTYPES.set(type, new Set(Object.keys(entry.subtypes)));
}

export function isValidType(type: string): type is ContextType {
  return VALID_TYPES.has(type);
}

export function isValidSubtype(type: ContextType, subtype: string): subtype is ContextSubtype {
  const subtypes = VALID_SUBTYPES.get(type);
  return subtypes?.has(subtype) ?? false;
}

export function getValidSubtypes(type: ContextType): string[] {
  // eslint-plugin-security flags typed taxonomy lookups generically; `type` is a constrained union.
  // eslint-disable-next-line security/detect-object-injection
  return Object.keys(TAXONOMY[type].subtypes);
}
