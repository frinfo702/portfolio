import {
  OG_CONTENT_TYPE,
  OG_SIZE,
  renderOgImage,
} from "../../../lib/og";
import {
  formatPostDate,
  getWritingParams,
  getWritingPost,
} from "../../../lib/writing";

export const dynamic = "force-static";

export const alt = "Writing by Kenichiro Goto";
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

export function generateStaticParams() {
  return getWritingParams();
}

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function Image({ params }: Props) {
  const { slug } = await params;
  const post = getWritingPost(slug);

  return renderOgImage({
    label: "Writing",
    title: post?.title ?? "Kenichiro Goto",
    footer: post
      ? `Kenichiro Goto · ${formatPostDate(post.date)}`
      : "kenichirog.com",
  });
}
