from __future__ import annotations

import os
from pathlib import Path
import subprocess
import sys
import tempfile
import textwrap
import unittest


class CheckerCliTest(unittest.TestCase):
    def test_cli_accepts_valid_python_example(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]
        env = {**os.environ, "PYTHONPATH": str(repo_root / "packages" / "python")}
        result = subprocess.run(
            [
                sys.executable,
                "-m",
                "codecontext_python",
                str(repo_root / "examples" / "python" / "payments" / "gateway.py"),
            ],
            cwd=repo_root,
            env={**env},
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual("", result.stderr)
        self.assertEqual(0, result.returncode)

    def test_cli_reports_invalid_tag(self) -> None:
        repo_root = Path(__file__).resolve().parents[3]

        with tempfile.TemporaryDirectory(prefix="codecontext-python-cli-") as temp_dir:
            root = Path(temp_dir)
            (root / "pyproject.toml").write_text(
                '[project]\nname = "fixture"\nversion = "0.0.0"\n',
                encoding="utf-8",
            )
            source_path = root / "src" / "example.py"
            source_path.parent.mkdir(parents=True, exist_ok=True)
            source_path.write_text(
                textwrap.dedent(
                    """
                    # @context banana -- Not allowed
                    value = 1
                    """
                ).strip()
                + "\n",
                encoding="utf-8",
            )

            result = subprocess.run(
                [sys.executable, "-m", "codecontext_python", str(source_path)],
                cwd=repo_root,
            env={**os.environ, "PYTHONPATH": str(repo_root / "packages" / "python")},
            capture_output=True,
            text=True,
            check=False,
        )

        self.assertEqual(1, result.returncode)
        self.assertIn('Unknown context type: "banana"', result.stderr)


if __name__ == "__main__":
    unittest.main()
