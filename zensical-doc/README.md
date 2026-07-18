# zensical-doc

Editorial documentation site built with [Zensical](https://zensical.org/), styled after a single-column reading layout (et-book, off-white canvas, TOC index).

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
uv run python -m unittest tests/test_editorial_theme.py
```
