# zensical-doc

Editorial documentation site built with [Zensical](https://zensical.org/), styled after a single-column reading layout (Open Sans, off-white canvas, TOC index).

## Develop

```bash
uv sync --group dev
uv run zensical serve
```

## Build

```bash
uv run zensical build --clean
```

## Test

```bash
uv run python -m unittest test/test_editorial_theme.py
```
