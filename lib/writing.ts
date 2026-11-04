import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

// Dev only: when .writing-fixture names a fixture (set by the Demo / Worst case switch,
// app/dev-fixture/route.dev.ts), content/fixtures/<name> stands in for the real posts.
// Production builds always read content/writing.
function writingDirectory(): string {
  if (process.env.NODE_ENV === "development") {
    try {
      const name = fs.readFileSync(path.join(process.cwd(), ".writing-fixture"), "utf8").trim();
      if (/^[a-z]+$/.test(name)) return path.join(process.cwd(), "content", "fixtures", name);
    } catch {
      // no marker: the real posts
    }
  }
  return path.join(process.cwd(), "content", "writing");
}

export type WritingPost = {
  slug: string;
  title: string;
  description: string;
  date: string;
  tags: string[];
  content: string;
};

export type WritingPostSummary = Omit<WritingPost, "content">;

export function getWritingPosts(): WritingPostSummary[] {
  return fs
    .readdirSync(writingDirectory(), { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => {
      const slug = entry.name.slice(0, -3);
      // The post route only serves slugs that match SLUG; a file it can't serve must not be
      // listed (it would be a 404 on the home page, in the feed and in the sitemap).
      if (!SLUG.test(slug)) {
        throw new Error(
          `content/writing/${entry.name}: file names must be lowercase letters, digits and hyphens (${SLUG})`,
        );
      }
      return readPost(slug);
    })
    .map(({ slug, title, description, date, tags }) => ({
      slug,
      title,
      description,
      date,
      tags,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

// output: "export" rejects an empty list, so an unlinked placeholder is
// generated in an empty content directory and removed after the build.
export const EMPTY_WRITING_SLUG = "_";

export function getWritingParams(): { slug: string }[] {
  const posts = getWritingPosts();
  return posts.length > 0
    ? posts.map((post) => ({ slug: post.slug }))
    : [{ slug: EMPTY_WRITING_SLUG }];
}

export function getWritingPost(slug: string): WritingPost | null {
  if (!SLUG.test(slug)) return null;

  const filename = path.join(writingDirectory(), `${slug}.md`);
  if (!fs.existsSync(filename)) return null;

  return readPost(slug);
}

export function formatPostDate(date: string): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00Z`));
}

const SLUG = /^[a-z0-9-]+$/;

function readPost(slug: string): WritingPost {
  const filename = path.join(writingDirectory(), `${slug}.md`);
  const source = fs.readFileSync(filename, "utf8");
  const { data, content } = matter(source);
  // YAML reads an unquoted `date: 2026-11-04` as a Date; keep the calendar day it names.
  if (data.date instanceof Date) data.date = data.date.toISOString().slice(0, 10);

  if (
    typeof data.title !== "string" ||
    typeof data.description !== "string" ||
    typeof data.date !== "string" ||
    !Array.isArray(data.tags) ||
    !data.tags.every((tag) => typeof tag === "string")
  ) {
    throw new Error(`Invalid front matter in ${filename}`);
  }

  return {
    slug,
    title: data.title,
    description: data.description,
    date: data.date,
    tags: data.tags,
    content,
  };
}
