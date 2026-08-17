---
title: "Markdown feature reference"
description: "A compact reference page that exercises the Markdown features supported by this site."
date: "2026-08-17"
tags:
  - Markdown
  - Writing
---

This page is both a writing reference and a rendering check. It covers CommonMark, GitHub Flavored Markdown, highlighted code, mathematical notation, and trusted inline HTML.

## Text and links

Plain text can contain **strong emphasis**, *emphasis*, ***both at once***, ~~deleted text~~, `inline code`, and [links](https://commonmark.org/). A URL such as https://nextjs.org/ is linked automatically.

Characters can be escaped with a backslash: \*this is not emphasis\*.

> Blockquotes are useful for excerpts and asides.
>
> They can contain multiple paragraphs and **formatted text**.

---

## Lists

1. Ordered lists
2. Preserve sequence
3. And can contain nested content
   - Nested unordered item
   - Another item

- [x] CommonMark rendering
- [x] GitHub Flavored Markdown
- [ ] Add the next article

## Tables

| Feature | Syntax | Status |
| :--- | :---: | ---: |
| Emphasis | `**text**` | Ready |
| Tables | Pipes | Ready |
| Mathematics | TeX | Ready |

## Code highlighting

Inline code such as `generateStaticParams()` stays compact. Fenced blocks are highlighted according to their language:

```typescript
type Post = {
  slug: string;
  title: string;
};

export function sortPosts(posts: Post[]) {
  return posts.toSorted((a, b) => a.title.localeCompare(b.title));
}
```

```python
def squared(values: list[int]) -> list[int]:
    return [value ** 2 for value in values]
```

```bash
npm run build
```

## Mathematics

Inline mathematics stays in the sentence, such as $E = mc^2$ or $O(n \log n)$.

Display mathematics receives its own line:

$$
\operatorname{softmax}(x_i) = \frac{e^{x_i}}{\sum_{j=1}^{K} e^{x_j}}
$$

An aligned derivation works as well:

$$
\begin{aligned}
f(x) &= x^2 + 2x + 1 \\
     &= (x + 1)^2
\end{aligned}
$$

## Media, footnotes, and HTML

Images use normal Markdown syntax:

![Kenichiro Goto site mark](/favicon.svg)

A statement can include a footnote.[^source] Footnotes are collected at the end of the article.

<details>
  <summary>Trusted inline HTML</summary>
  <p>Local Markdown files may use standard HTML elements, including <kbd>Command</kbd> + <kbd>K</kbd>, when Markdown alone is not enough.</p>
</details>

[^source]: This footnote is rendered by the GitHub Flavored Markdown pipeline.
