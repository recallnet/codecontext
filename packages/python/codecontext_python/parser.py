from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
import re

CONTEXT_PATTERN = re.compile(
    r"^@context(?:\s+|:)([a-z][a-z0-9]*)(?::([a-z][a-z0-9]*))?\s*"
    r"(?:#([A-Za-z0-9_./-]+))?\s*"
    r"(?:!(critical|high|low))?\s*"
    r"(?:\[verified:(\d{4}-\d{2}-\d{2})\])?\s*"
    r"(?:—|--)\s*(.+)$"
)
CONTEXT_PREFIX = re.compile(r"^@context(?:\s+|:)")

TAXONOMY: dict[str, set[str]] = {
    "decision": {"tradeoff", "constraint", "assumption"},
    "requirement": set(),
    "risk": {"perf", "security", "compat"},
    "related": set(),
    "history": set(),
    "doc": set(),
}


@dataclass(slots=True)
class NormalizedTag:
    type: str
    subtype: str | None
    id: str | None
    priority: str | None
    verified: str | None
    summary: str
    line: int


@dataclass(slots=True)
class ParseSourceResult:
    tags: list[NormalizedTag] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)


def parse_source(
    source: str,
    project_root: str | Path,
    context_dir: str = "docs/context",
    *,
    check_refs: bool = True,
) -> ParseSourceResult:
    result = ParseSourceResult()
    root = Path(project_root)

    for line_number, line in enumerate(source.splitlines(), start=1):
        text = _strip_comment_delimiters(line).strip()
        if not CONTEXT_PREFIX.match(text):
            continue

        match = CONTEXT_PATTERN.match(text)
        if match is None:
            result.errors.append(f'Malformed @context tag: "{text}"')
            continue

        context_type, context_subtype, ref, priority, verified, summary = match.groups()

        if context_type not in TAXONOMY:
            result.errors.append(f'Unknown context type: "{context_type}"')
            continue

        if context_subtype and context_subtype not in TAXONOMY[context_type]:
            result.errors.append(
                f'Invalid subtype "{context_subtype}" for type "{context_type}"'
            )
            continue

        if verified and not _is_valid_verified_date(verified):
            result.errors.append(
                f'Invalid verification date "{verified}". Expected YYYY-MM-DD.'
            )
            continue

        result.tags.append(
            NormalizedTag(
                type=context_type,
                subtype=context_subtype or None,
                id=ref or None,
                priority=priority or None,
                verified=verified or None,
                summary=summary.strip(),
                line=line_number,
            )
        )

        if not ref or not check_refs:
            continue

        if not _reference_exists(root, context_dir, ref):
            result.errors.append(f'Unresolved context reference: "{ref}"')

    return result


def find_project_root(start_dir: str | Path) -> Path | None:
    current = Path(start_dir).resolve()
    markers = ("pyproject.toml", "package.json", "go.mod", ".git")

    for candidate in (current, *current.parents):
        if any((candidate / marker).exists() for marker in markers):
            return candidate
    return None


def _strip_comment_delimiters(line: str) -> str:
    stripped = line.strip()
    if stripped.startswith("#"):
        return stripped[1:].lstrip()
    return stripped


def _is_valid_verified_date(value: str) -> bool:
    try:
        parsed = datetime.strptime(value, "%Y-%m-%d")
    except ValueError:
        return False
    return parsed.strftime("%Y-%m-%d") == value


def _reference_exists(project_root: Path, context_dir: str, ref: str) -> bool:
    candidates: list[Path] = []
    if "/" in ref or "." in ref:
        candidates.append(project_root / Path(ref))
    else:
        candidates.extend(
            [
                project_root / ref,
                project_root / context_dir / ref,
            ]
        )

    return any(candidate.exists() for candidate in candidates)
