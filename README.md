# kenichirog.com

Personal site for Kenichiro Goto, built with Next.js 16 and deployed as a static export to Cloudflare Pages.

## Development

Requires Node.js 22 or newer.

```bash
npm install
npm run dev        # http://localhost:3000
npm run lint
npm run build      # writes the static site to out/
npm run preview    # build, watch, and serve out/
```

## Writing

Posts live in `content/writing/<slug>.md`. The filename becomes the URL slug and must contain only lowercase letters, numbers, and hyphens.

```md
---
title: "VLM notes 1: from pixels to tokens"
description: "How a vision-language model turns an image into tokens."
date: "2026-10-02"
tags: ["vision", "language models"]
---

Markdown starts here.
```

The landing page hides the Writing section when there are no posts. With at least one post, the home page, sitemap, RSS feed, and per-post OG image are generated at build time.

## Site metadata

`NEXT_PUBLIC_SITE_URL` overrides the production origin (default: `https://kenichirog.com`). It is used for canonical URLs, Open Graph metadata, `sitemap.xml`, `robots.txt`, and `feed.xml`.

## Deployment

Pushing to `main` runs `.github/workflows/deploy-cloudflare.yml`: install, lint, build, then deploy `out/` to the `portfolio` Cloudflare Pages project. Pull requests build and lint without deploying.

## Project layout

- `app/page.tsx`: landing page and writing index
- `app/writing/[slug]/page.tsx`: Markdown article rendering
- `app/opengraph-image.tsx`, `app/writing/[slug]/opengraph-image.tsx`: generated social cards
- `app/feed.xml/route.ts`: RSS feed
- `app/sitemap.ts`, `app/robots.ts`: crawler metadata
- `lib/writing.ts`: Markdown loading and front matter validation
- `lib/site.ts`: site name, description, and origin
- `lib/og.tsx`: shared Open Graph image renderer
- `content/writing/`: posts
- `public/`: static assets and resume
