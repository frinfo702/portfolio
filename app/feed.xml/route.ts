import { getWritingPosts } from "../../lib/writing";
import { siteDescription, siteName, siteUrl } from "../../lib/site";

export const dynamic = "force-static";

const escapeXml = (value: string) =>
  value.replace(
    /[<>&'"]/g,
    (character) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        "'": "&apos;",
        '"': "&quot;",
      })[character] ?? character,
  );

function postUrl(slug: string): string {
  return new URL(`/writing/${slug}`, siteUrl).toString();
}

export function GET() {
  const posts = getWritingPosts();
  const items = posts
    .map(
      (post) => `<item>
  <title>${escapeXml(post.title)}</title>
  <link>${escapeXml(postUrl(post.slug))}</link>
  <guid isPermaLink="true">${escapeXml(postUrl(post.slug))}</guid>
  <pubDate>${new Date(`${post.date}T00:00:00Z`).toUTCString()}</pubDate>
  <description>${escapeXml(post.description)}</description>
${post.tags
  .map((tag) => `  <category>${escapeXml(tag)}</category>`)
  .join("\n")}
</item>`,
    )
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${escapeXml(siteName)} — Writing</title>
  <link>${escapeXml(new URL("/", siteUrl).toString())}</link>
  <description>${escapeXml(siteDescription)}</description>
  <language>en</language>
  <atom:link href="${escapeXml(new URL("/feed.xml", siteUrl).toString())}" rel="self" type="application/rss+xml" />
  <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
</channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
    },
  });
}
