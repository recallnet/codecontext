# codecontext Go Analyzer

Go support for codecontext is provided as a `go/analysis` analyzer that can be wired into `golangci-lint` custom module plugins or run in Go-native tooling.

It validates:

- `@context` tag syntax
- known type/subtype combinations
- local `#ref` resolution

## Package Layout

- `analyzer`: exported `go/analysis` analyzer
- `plugin`: `golangci-lint` module-plugin entrypoint

## Example

```go
// @context decision:constraint #docs/context/api-limits.md !high -- Stripe caps batch size at 100
func sendBatch() {}
```

## golangci-lint Module Plugin

Use the `plugin` package as the entrypoint in your custom `golangci-lint` build.
