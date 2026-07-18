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
            [str(ROOT / ".venv/bin/zensical"), "build"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=False,
        )
        if result.returncode != 0:
            raise AssertionError(result.stderr or result.stdout)

    def test_homepage_is_toc_without_chapter_chrome(self) -> None:
        html = (SITE / "index.html").read_text(encoding="utf-8")
        source = (ROOT / "docs/index.md").read_text(encoding="utf-8")
        self.assertIn('class="av-toc"', html)
        self.assertIn("Table of contents", html)
        self.assertNotIn('<ol class="av-toc">', source)
        self.assertIn('href="./get-started/"', html)
        self.assertIn('href="./maths/"', html)
        self.assertIn('class="av-toc-title">Test</span>', html)
        self.assertIn('href="./test/"', html)
        self.assertNotIn('class="av-top"', html)
        self.assertIn("stylesheets/extra.css", html)

    def test_extra_css_defines_reference_tokens(self) -> None:
        css = (ROOT / "docs/stylesheets/extra.css").read_text(encoding="utf-8")
        self.assertIn("--av-background: #fafaf8", css)
        self.assertIn("--av-foreground: #111", css)
        self.assertIn("--av-muted: #6b7280", css)
        self.assertIn("--av-border: #e5e5e3", css)
        self.assertIn('--md-text-font: "Open Sans", Arial, sans-serif', css)
        self.assertIn('[data-md-color-scheme="slate"]', css)
        self.assertIn("--av-background: #141413", css)

    def test_toolbar_exposes_search_and_palette(self) -> None:
        html = (SITE / "index.html").read_text(encoding="utf-8")
        self.assertIn('class="md-header av-toolbar"', html)
        self.assertIn('data-md-component="search"', html)
        self.assertIn('data-md-component="palette"', html)
        self.assertIn('data-md-color-scheme="slate"', html)
        self.assertIn("Switch to dark mode", html)

    def test_chapter_page_has_editorial_header(self) -> None:
        html = (SITE / "get-started/index.html").read_text(encoding="utf-8")
        self.assertIn('class="av-top"', html)
        self.assertIn("Documentation · Chapter 1", html)
        self.assertIn('class="av-lede"', html)
        self.assertIn("Published Jul 18, 2026", html)
        self.assertIn('"Open Sans"', html)

    def test_section_index_has_automatic_child_contents(self) -> None:
        html = (SITE / "test/index.html").read_text(encoding="utf-8")
        contents = html.split('<div class="av-section-contents">', 1)[1].split("</div>", 1)[0]
        self.assertIn('class="av-section-contents"', html)
        self.assertIn('href="./test_a/"', html)
        self.assertIn('href="./test_b/"', html)
        self.assertNotIn('href="././"', contents)

    def test_link_preview_script_keeps_markdown_links(self) -> None:
        html = (SITE / "test/test_a/index.html").read_text(encoding="utf-8")
        self.assertIn('src="../../javascripts/autoembed.js"', html)
        self.assertIn('<p><a href="https://www.spacex.com/">SpaceX website</a></p>', html)
        javascript = (ROOT / "docs/javascripts/autoembed.js").read_text(encoding="utf-8")
        self.assertIn("api.microlink.io", javascript)
        self.assertIn("metadata.image", javascript)


if __name__ == "__main__":
    unittest.main()
