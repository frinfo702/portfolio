"""Smoke tests for the editorial documentation theme."""

from __future__ import annotations

import subprocess
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SITE = ROOT / "site"


class EditorialThemeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        result = subprocess.run(
            [str(ROOT / ".venv/bin/zensical"), "build", "--clean"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise AssertionError(result.stderr or result.stdout)

    def test_homepage_is_toc_without_chapter_chrome(self) -> None:
        html = (SITE / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="av-toc"', html)
        self.assertIn("Table of contents", html)
        self.assertNotIn('class="av-top"', html)
        self.assertIn("stylesheets/extra.css", html)

    def test_extra_css_defines_reference_tokens(self) -> None:
        css = (ROOT / "docs/stylesheets/extra.css").read_text(encoding="utf-8")
        self.assertIn("--av-background: #fafaf8", css)
        self.assertIn("--av-foreground: #111", css)
        self.assertIn("--av-muted: #6b7280", css)
        self.assertIn("--av-border: #e5e5e3", css)
        self.assertIn('font-family: et-book', css)

    def test_chapter_page_has_editorial_header(self) -> None:
        html = (SITE / "get-started/index.html").read_text(encoding="utf-8")
        self.assertIn('class="av-top"', html)
        self.assertIn("Documentation · Chapter 1", html)
        self.assertIn('class="av-lede"', html)
        self.assertIn("Published Jul 18, 2026", html)
        self.assertIn("et-book", html)


if __name__ == "__main__":
    unittest.main()
