---
id: gate-42
type: decision
status: active
verified: 2025-11-15
owners:
  - "@alice"
  - "@bob"
traces:
  - "JIRA-1234"
  - "INCIDENT-5678"
---

## Decision

Use strict greater-than (`>`) not greater-than-or-equal (`>=`) when comparing
`message.timestamp` against `cutoff` in the payment gateway message processor.

## Why

The upstream payment gateway sends messages with timestamps that can land
exactly on the cutoff boundary during clock-skew windows. This was observed in
production during INCIDENT-5678: a 12-minute clock-skew event caused the
gateway to emit messages where `timestamp === cutoff` for approximately 0.3%
of transactions.

Using `>=` caused those transactions to be processed twice -- once in the
current batch and once in the next. Duplicate processing triggered duplicate
charges for 847 customers over a 12-minute window.

Switching to strict `>` ensures that boundary messages are deferred to the next
batch. A deferred message is retried and processed exactly once. A duplicated
message causes a customer-facing defect.

## Alternatives Considered

- **>= with downstream dedup via Redis** -- Adds a Redis `SETNX` check on
  every processed message ID. Rejected: introduces a hard runtime dependency
  on Redis for a case that only manifests during clock skew. Redis downtime
  during a clock-skew event would compound the incident rather than mitigate
  it.

- **Widen the cutoff window by 1ms** (`cutoff + 1`) -- Masks the boundary
  condition rather than handling it. Rejected: creates a different off-by-one
  where messages at `cutoff + 1` are incorrectly excluded, making the bug
  harder to reproduce and diagnose.

- **Request upstream fix for clock-skew behavior** -- Raised with the gateway
  team (JIRA-1234). Their response: clock skew is within their SLA tolerance
  and they have no plans to change the behavior. We must handle it on our side.

## Constraints

- The upstream gateway team will not fix their clock-skew emission behavior.
  This is documented in their API contract as acceptable.
- Our payment processing SLA requires zero duplicate charges.
- The message retry system guarantees at-least-once delivery, so deferring a
  boundary message to the next batch is safe -- it will be picked up.
