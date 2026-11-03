import type { MetadataRoute } from "next";
import { getWritingPosts } from "@/lib/writing";
import { siteUrl } from "@/lib/site";

export const dynamic = "force-static";

function absoluteUrl(path: string): string {
  return new URL(path, siteUrl).toString();
}

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getWritingPosts();
  const latestPost = posts[0];
  const lastModified = latestPost
    ? new Date(`${latestPost.date}T00:00:00Z`)
    : new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified,
      changeFrequency: "monthly",
      priority: 1,
    },
    ...posts.map((post) => ({
      url: absoluteUrl(`/writing/${post.slug}`),
      lastModified: new Date(`${post.date}T00:00:00Z`),
      changeFrequency: "yearly" as const,
      priority: 0.7,
    })),
  ];
}
