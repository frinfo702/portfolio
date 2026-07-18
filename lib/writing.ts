export type WritingPiece = {
  slug: string;
  title: string;
  description: string;
  date: string;
  href: string;
  kind: string;
};

export const writings: WritingPiece[] = [
  {
    slug: "documentation",
    title: "Documentation",
    description:
      "A from-scratch guide to writing docs with Zensical: Markdown authoring, formatting, diagrams, maths, and the pieces that make a polished documentation site.",
    date: "Jul 18, 2026",
    href: "/docs/",
    kind: "Guide",
  },
];

export function getWritingBySlug(slug: string): WritingPiece | undefined {
  return writings.find((piece) => piece.slug === slug);
}
