# Examples

This folder contains small TypeScript, Go, and Python examples showing different
`@context` variations:

- canonical `@context <type>` syntax
- legacy `@context:<type>` compatibility
- `decision`, `requirement`, `risk`, `related`, `history`, and `doc`
- subtype usage
- explicit `[verified:YYYY-MM-DD]` dates on tags
- direct `#ref` links to ordinary project files
- optional structured `.ctx.md` documents with frontmatter `verified:` dates

Files:

- `ts/payments/gateway.ts`
- `go/payments/gateway.go`
- `python/payments/gateway.py`
- `docs/context/gate-42.md`
- `docs/context/cache-strategy.ctx.md`
- `docs/requirements/billing-rounding.md`
