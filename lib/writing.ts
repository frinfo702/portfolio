import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const writingDirectory = path.join(process.cwd(), "content", "writing");

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
    .readdirSync(writingDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => readPost(entry.name.slice(0, -3)))
    .map(({ slug, title, description, date, tags }) => ({
      slug,
      title,
      description,
      date,
      tags,
    }))
    .sort((a, b) => b.date.localeCompare(a.date));
}

export function getWritingPost(slug: string): WritingPost | null {
  if (!/^[a-z0-9-]+$/.test(slug)) return null;

  const filename = path.join(writingDirectory, `${slug}.md`);
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

function readPost(slug: string): WritingPost {
  const filename = path.join(writingDirectory, `${slug}.md`);
  const source = fs.readFileSync(filename, "utf8");
  const { data, content } = matter(source);

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
