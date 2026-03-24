package invalid

// @context nope -- unknown type // want `unknown @context type "nope"`
func UnknownType() {}

// @context decision:nope -- bad subtype // want `invalid @context subtype "nope" for type "decision"`
func InvalidSubtype() {}

// @context decision #docs/context/missing.md -- missing ref // want `unresolved @context reference "docs/context/missing.md"`
func MissingRef() {}

// @context decision malformed // want `malformed @context tag`
func Malformed() {}
