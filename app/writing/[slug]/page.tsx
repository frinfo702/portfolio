import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { lookup } from "node:dns/promises";
import { Children, isValidElement } from "react";
import type { ReactNode } from "react";
import { getLinkPreview, type ILinkPreviewResponse } from "link-preview-js";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import ReactMarkdown from "react-markdown";
import type { Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import SiteFrame from "../../components/SiteFrame";
import {
  formatPostDate,
  getWritingPost,
  getWritingPosts,
} from "../../../lib/writing";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getWritingPosts().map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getWritingPost(slug);

  if (!post) return {};

  return {
    title: `${post.title} | Kenichiro Goto`,
    description: post.description,
  };
}

export default async function WritingPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getWritingPost(slug);

  if (!post) notFound();

  const linkPreviews = await loadLinkPreviews(post.content);

  return (
    <SiteFrame active="writing">
      <article className="markdown-article">
        <Link className="article-back" href="/writing">
          Back to writing
        </Link>
        <header className="article-header">
          <h2>{post.title}</h2>
          <p>{post.description}</p>
          <div className="article-meta">
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
            <span aria-hidden="true">·</span>
            <span>{post.tags.join(" · ")}</span>
          </div>
        </header>
        <div className="markdown-body">
          <ReactMarkdown
            components={createMarkdownComponents(linkPreviews)}
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[
              rehypeRaw,
              rehypeKatex,
              rehypeHighlight,
              rehypeSlug,
              [rehypeAutolinkHeadings, { behavior: "wrap" }],
            ]}
          >
            {post.content}
          </ReactMarkdown>
        </div>
      </article>
    </SiteFrame>
  );
}

function createMarkdownComponents(
  linkPreviews: ReadonlyMap<string, ILinkPreviewResponse | null>,
): Components {
  return {
    p({ children }) {
      const url = getStandaloneUrl(children);
      if (url && linkPreviews.has(url)) {
        return (
          <LinkPreviewCard url={url} preview={linkPreviews.get(url) ?? null} />
        );
      }

      return <p>{children}</p>;
    },
    a({ href, children }) {
      return <a href={href}>{children}</a>;
    },
  };
}

function getStandaloneUrl(children: ReactNode): string | null {
  const nodes = Children.toArray(children);
  if (nodes.length !== 1) return null;

  const node = nodes[0];
  if (!isValidElement(node) || typeof node.props !== "object" || !node.props) {
    return null;
  }

  if (!("href" in node.props) || !("children" in node.props)) return null;

  const { href, children: linkText } = node.props;
  if (typeof href !== "string" || typeof linkText !== "string") return null;
  if (linkText.trim() !== href.trim() || !isHttpUrl(href)) return null;

  return href;
}

function getStandaloneUrls(content: string): string[] {
  const urls = new Set<string>();
  let fence: string | null = null;

  for (const line of content.split(/\r?\n/)) {
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }

    if (fence || /^\s{4}/.test(line)) continue;

    const value = line.trim();
    if (isHttpUrl(value)) urls.add(value);
  }

  return [...urls];
}

async function loadLinkPreviews(
  content: string,
): Promise<Map<string, ILinkPreviewResponse | null>> {
  const entries = await Promise.all(
    getStandaloneUrls(content).map(
      async (url): Promise<[string, ILinkPreviewResponse | null]> => {
        try {
          const response = await getLinkPreview(url, {
            timeout: 5000,
            followRedirects: "manual",
            handleRedirects: sameHostRedirect,
            resolveDNSHost: async (value) =>
              (await lookup(new URL(value).hostname)).address,
          });

          return [url, "title" in response ? response : null];
        } catch {
          return [url, null];
        }
      },
    ),
  );

  return new Map(entries);
}

function sameHostRedirect(baseUrl: string, forwardedUrl: string): boolean {
  const base = new URL(baseUrl);
  const forwarded = new URL(forwardedUrl);
  const sameHost =
    forwarded.hostname === base.hostname ||
    forwarded.hostname === `www.${base.hostname}` ||
    `www.${forwarded.hostname}` === base.hostname;

  return sameHost && forwarded.protocol === "https:";
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return (
      (url.protocol === "http:" || url.protocol === "https:") &&
      url.hostname.length > 0
    );
  } catch {
    return false;
  }
}

function LinkPreviewCard({
  url,
  preview,
}: {
  url: string;
  preview: ILinkPreviewResponse | null;
}) {
  const hostname = new URL(url).hostname.replace(/^www\./, "");
  const siteName = preview?.siteName?.trim() || hostname;
  const title = preview?.title?.trim() || hostname;
  const description = preview?.description?.trim();
  const image = getPreviewImage(preview);

  return (
    <article className="link-preview">
      <a
        className="link-preview-link"
        href={url}
        target="_blank"
        rel="noreferrer"
      >
        {image ? (
          <span className="link-preview-media">
            <Image
              src={image}
              alt=""
              fill
              sizes="(max-width: 47.99rem) 30vw, 9.5rem"
              unoptimized
            />
          </span>
        ) : (
          <span className="link-preview-mark" aria-hidden="true">
            {siteName.charAt(0).toUpperCase()}
          </span>
        )}
        <span className="link-preview-copy">
          <span className="link-preview-site">{siteName}</span>
          <strong className="link-preview-title">{title}</strong>
          {description && (
            <span className="link-preview-description">{description}</span>
          )}
          <span className="link-preview-url">{hostname}</span>
        </span>
      </a>
    </article>
  );
}

function getPreviewImage(preview: ILinkPreviewResponse | null): string | null {
  const image = preview?.images[0];
  if (!image) return null;

  try {
    const url = new URL(image);
    return url.protocol === "http:" || url.protocol === "https:" ? image : null;
  } catch {
    return null;
  }
}
