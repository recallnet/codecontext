# codecontext Ruby Checker

Ruby support for codecontext is provided as a small native checker that validates
`@context` annotations in `#` comments.

It validates:

- `@context` tag syntax
- known type/subtype combinations
- local `{@link file:...}` resolution
- explicit `[verified:YYYY-MM-DD]` dates

## Package Layout

- `lib/codecontext/ruby`: parser, checker, and CLI entrypoint
- `exe/codecontext-ruby`: executable wrapper
- `test`: parser and checker tests

## Example

```ruby
# @context decision:constraint {@link file:docs/context/api-limits.md} !high [verified:2026-03-24] -- Stripe caps batch size at 100.
def clamp_batch_size(size)
  [size, 100].min
end
```

## Local Usage

```bash
gem build codecontext-ruby.gemspec
gem install --local codecontext-ruby-*.gem
codecontext-ruby examples/ruby/payments/gateway.rb
```
