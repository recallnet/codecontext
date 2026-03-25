from __future__ import annotations

import argparse
import sys

from .checker import check_paths


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="codecontext-python",
        description="Validate @context annotations in Python files.",
    )
    parser.add_argument("paths", nargs="+", help="Python files or directories to scan")
    parser.add_argument(
        "--context-dir",
        default="docs/context",
        help="Fallback context directory for bare file names",
    )
    parser.add_argument(
        "--no-check-refs",
        action="store_true",
        help="Skip local {@link file:...} existence checks",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    messages = check_paths(
        args.paths,
        context_dir=args.context_dir,
        check_refs=not args.no_check_refs,
    )

    if not messages:
        return 0

    for message in messages:
        print(f"{message.file}:{message.line}: {message.message}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
