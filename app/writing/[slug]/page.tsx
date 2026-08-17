import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import ReactMarkdown from "react-markdown";
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
