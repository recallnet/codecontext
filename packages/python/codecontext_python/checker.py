from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

from .parser import find_project_root, parse_source


@dataclass(slots=True)
class CheckMessage:
    file: str
    line: int
    message: str


def check_paths(
    paths: Iterable[str | Path],
    *,
    context_dir: str = "docs/context",
    check_refs: bool = True,
) -> list[CheckMessage]:
    messages: list[CheckMessage] = []

    for file_path in _iter_python_files(paths):
        source = file_path.read_text(encoding="utf-8")
        project_root = find_project_root(file_path.parent) or file_path.parent
        result = parse_source(
            source,
            project_root,
            context_dir,
            check_refs=check_refs,
        )

        unresolved_lines = {tag.id: tag.line for tag in result.tags if tag.id}

        for error in result.errors:
            line = 1
            if error.startswith("Unresolved context reference: "):
                ref = error.removeprefix('Unresolved context reference: "').removesuffix('"')
                line = unresolved_lines.get(ref, 1)
            elif error.startswith("Malformed @context tag: "):
                line = _first_context_line(source)
            else:
                for tag in result.tags:
                    if tag.line:
                        line = tag.line
                        break
            messages.append(CheckMessage(str(file_path), line, error))

    return messages


def _iter_python_files(paths: Iterable[str | Path]) -> list[Path]:
    files: list[Path] = []
    for raw_path in paths:
        path = Path(raw_path)
        if path.is_dir():
            files.extend(sorted(candidate for candidate in path.rglob("*.py") if candidate.is_file()))
        elif path.suffix == ".py" and path.is_file():
            files.append(path)
    seen: set[Path] = set()
    unique: list[Path] = []
    for file_path in files:
        resolved = file_path.resolve()
        if resolved in seen:
            continue
        seen.add(resolved)
        unique.append(file_path)
    return unique


def _first_context_line(source: str) -> int:
    for line_number, line in enumerate(source.splitlines(), start=1):
        if "@context" in line:
            return line_number
    return 1
