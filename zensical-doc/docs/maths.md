---
title: Maths & notation
chapter: Chapter 4
description: Render equations with MathJax, from inline fragments to display-mode series expansions.
date: Jul 18, 2026
hide:
  - navigation
  - toc
  - footer
---

*Technical writing often needs precise notation. MathJax turns TeX-like markup into readable equations without leaving Markdown.*

## Display math

> Go to [documentation](https://zensical.org/docs/authoring/math/)

$$
\cos x=\sum_{k=0}^{\infty}\frac{(-1)^k}{(2k)!}x^{2k}
$$

## Configuration note

!!! warning "Needs configuration"

    MathJax is included via a `script` tag on this page and is not
    configured globally by default, so pages without maths stay light.
    See the documentation if your whole site is maths-heavy.

<script id="MathJax-script" src="https://unpkg.com/mathjax@3/es5/tex-mml-chtml.js"></script>
<script>
  window.MathJax = {
    tex: {
      inlineMath: [["\\(", "\\)"]],
      displayMath: [["\\[", "\\]"]],
      processEscapes: true,
      processEnvironments: true
    },
    options: {
      ignoreHtmlClass: ".*|",
      processHtmlClass: "arithmatex"
    }
  };

  document$.subscribe(() => {
    MathJax.startup.output.clearCache()
    MathJax.typesetClear()
    MathJax.texReset()
    MathJax.typesetPromise()
  })
</script>
