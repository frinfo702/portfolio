---
title: Get started
chapter: Chapter 1
description: Install Zensical, learn the core commands, and see admonitions, code blocks, tabs, and diagrams in action.
date: Jul 18, 2026
hide:
  - navigation
  - toc
  - footer
---

*What a documentation toolchain actually is, once you strip away the marketing: Markdown in, a readable site out, plus the loop that ties authoring and preview together.*

## Where we're going

Zensical turns plain Markdown into a documentation site. This chapter covers the commands you need day to day, then walks through the authoring features you will reach for first.

For full documentation visit [zensical.org](https://zensical.org/docs/).

## Commands

- [`zensical new`](https://zensical.org/docs/usage/new/) — Create a new project
- [`zensical serve`](https://zensical.org/docs/usage/preview/) — Start a local web server
- [`zensical build`](https://zensical.org/docs/usage/build/) — Build your site

## Admonitions

> Go to [documentation](https://zensical.org/docs/authoring/admonitions/)

!!! note

    This is a **note** admonition. Use it to provide helpful information.

!!! warning

    This is a **warning** admonition. Be careful!

## Details

> Go to [documentation](https://zensical.org/docs/authoring/admonitions/#collapsible-blocks)

??? info "Click to expand for more info"

    This content is hidden until you click to expand it.
    Great for FAQs or long explanations.

## Code blocks

> Go to [documentation](https://zensical.org/docs/authoring/code-blocks/)

``` python hl_lines="2" title="Code blocks"
def greet(name):
    print(f"Hello, {name}!") # (1)!

greet("Python")
```

1.  > Go to [documentation](https://zensical.org/docs/authoring/code-blocks/#code-annotations)

    Code annotations allow you to attach notes to lines of code.

Code can also be highlighted inline: `#!python print("Hello, Python!")`.

## Content tabs

> Go to [documentation](https://zensical.org/docs/authoring/content-tabs/)

=== "Python"

    ``` python
    print("Hello from Python!")
    ```

=== "Rust"

    ``` rs
    println!("Hello from Rust!");
    ```

## Diagrams

> Go to [documentation](https://zensical.org/docs/authoring/diagrams/)

``` mermaid
graph LR
  A[Start] --> B{Error?};
  B -->|Yes| C[Hmm...];
  C --> D[Debug];
  D --> B;
  B ---->|No| E[Yay!];
```
