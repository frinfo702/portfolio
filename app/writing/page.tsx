import type { Metadata } from "next";
import Link from "next/link";
import SiteFrame from "../components/SiteFrame";
import { formatPostDate, getWritingPosts } from "../../lib/writing";

export const metadata: Metadata = {
  title: "Writing | Kenichiro Goto",
  description:
    "Notes on software engineering, machine learning, and continuous learning by Kenichiro Goto.",
};

export default function WritingPage() {
  const posts = getWritingPosts();

  return (
    <SiteFrame active="writing">
      <h2 className="page-heading">Writing</h2>
      <ol className="writing-list">
        {posts.map((post) => (
          <li key={post.slug}>
            <Link href={`/writing/${post.slug}`}>
              <strong>{post.title}</strong>
              <small>{post.description}</small>
            </Link>
            <time dateTime={post.date}>{formatPostDate(post.date)}</time>
          </li>
        ))}
      </ol>
    </SiteFrame>
  );
}
