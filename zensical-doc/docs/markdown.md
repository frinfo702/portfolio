---
title: Markdown in 5min
chapter: Chapter 2
description: Headers, emphasis, links, lists, tables, and the everyday Markdown patterns you will use constantly.
date: Jul 18, 2026
hide:
  - navigation
  - toc
  - footer
---

*The language of documentation is Markdown. This chapter is a short field guide to the syntax you will type constantly.*

## Headers

```
# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header
```

## Text formatting

```
**bold text**
*italic text*
***bold and italic***
~~strikethrough~~
`inline code`
```

## Links and images

```
[Link text](https://example.com)
[Link with title](https://example.com "Hover title")
![Alt text](image.jpg)
![Image with title](image.jpg "Image title")
```

### Link preview cards

A standalone URL becomes a preview card automatically:

https://example.com/

For a richer, explicit card, use the corrected closing tag `</Emb>` and optional metadata attributes:

<Emb title="Example" description="A custom description for the link preview.">https://example.com/</Emb>

Normal Markdown links remain normal links:

[Read the example](https://example.com/)

## Lists

Unordered:

- Item 1
- Item 2
  - Nested item

Ordered:

1. First item
2. Second item
3. Third item

## Tables

| Feature | Supported |
| ------- | --------- |
| Tables  | Yes       |
| Lists   | Yes       |
| Code    | Yes       |

## Blockquotes

> This is a blockquote.
> It can span multiple lines.

## Horizontal rules

Use three dashes for a rule:

---

## That's enough to start

Once these patterns feel automatic, the rest of Zensical is mostly configuration and taste.
