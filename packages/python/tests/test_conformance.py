from __future__ import annotations

import json
from pathlib import Path
import tempfile
import unittest

from codecontext_python.parser import parse_source


class ConformanceTest(unittest.TestCase):
    def test_shared_conformance_fixtures(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        fixtures_dir = repo_root / "packages" / "conformance-fixtures" / "cases"

        for fixture_path in sorted(fixtures_dir.glob("*.json")):
            fixture = json.loads(fixture_path.read_text(encoding="utf-8"))
            if "py" not in fixture["implementations"]:
                continue

            with self.subTest(fixture=fixture["id"]):
                with tempfile.TemporaryDirectory(prefix=f'codecontext-{fixture["id"]}-') as temp_dir:
                    root = Path(temp_dir)
                    (root / "pyproject.toml").write_text(
                        '[project]\nname = "fixture"\nversion = "0.0.0"\n',
                        encoding="utf-8",
                    )

                    for relative_path, content in fixture.get("supportFiles", {}).items():
                        abs_path = root / relative_path
                        abs_path.parent.mkdir(parents=True, exist_ok=True)
                        abs_path.write_text(content, encoding="utf-8")

                    file_path = fixture.get("filePathByImplementation", {}).get(
                        "py", fixture["filePath"]
                    )
                    source = fixture.get("sourceByImplementation", {}).get(
                        "py", fixture["source"]
                    )

                    source_path = root / file_path
                    source_path.parent.mkdir(parents=True, exist_ok=True)
                    source_path.write_text(source, encoding="utf-8")

                    result = parse_source(source, root)
                    got_tags = [
                        {
                            "type": tag.type,
                            "subtype": tag.subtype,
                            "id": tag.id,
                            "priority": tag.priority,
                            "verified": tag.verified,
                            "summary": tag.summary,
                            "line": tag.line,
                        }
                        for tag in result.tags
                    ]
                    want_tags = [
                        {
                            **tag,
                            "verified": tag.get("verified"),
                        }
                        for tag in fixture["expected"]["tags"]
                    ]

                    self.assertEqual(want_tags, got_tags)
                    self.assertEqual(fixture["expected"]["errors"], result.errors)
                    self.assertEqual(
                        sorted(fixture["expected"]["resolvedCtxFiles"]),
                        sorted(result.resolved_ctx_files),
                    )


if __name__ == "__main__":
    unittest.main()
