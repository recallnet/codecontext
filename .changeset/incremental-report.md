---
"@recallnet/codecontext-cli": minor
---

Add `--since-ref <git-ref>` flag for incremental repo-wide reports. When used with `--report --json`, limits output to annotations in files changed since the provided ref. JSON output now includes `blockHash`, `verified`, `verifiedDate`, `reason`, and `sinceRef` metadata for downstream indexing pipelines.
