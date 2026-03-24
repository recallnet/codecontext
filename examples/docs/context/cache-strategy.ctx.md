---
id: cache-strategy
type: decision
status: active
verified: 2026-03-24
owners:
  - "@platform"
traces:
  - "RFC-0042"
---

## Decision

Use an in-process LRU cache for the hot read path.

## Why

LFU produced slightly better hit rates in synthetic tests but added enough
bookkeeping overhead to hurt p99 latency in real traffic.
