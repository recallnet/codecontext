# codecontext Python Checker

Python support for codecontext is provided as a small native checker that validates
`@context` annotations in `#` comments.

It validates:

- `@context` tag syntax
- known type/subtype combinations
- local `#ref` resolution
- explicit `[verified:YYYY-MM-DD]` dates

## Package Layout

- `codecontext_python`: parser and CLI entrypoint
- `tests`: conformance and checker tests

## Example

```python
# @context decision:constraint #docs/context/api-limits.md !high [verified:2026-03-24] -- Stripe caps batch size at 100.
def clamp_batch_size(size: int) -> int:
    return min(size, 100)
```

## Local Usage

```bash
python3 -m pip install -e packages/python
codecontext-python examples/python/payments/gateway.py
```
