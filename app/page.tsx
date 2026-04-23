import PixelLandscape from "./components/PixelLandscape";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <main className="flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        <header className="flex items-center justify-between mb-16">
          <h1 className="text-base font-semibold text-white">Kenichiro Goto</h1>
        </header>

        <PixelLandscape />

        <section className="flex flex-col gap-6 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            I build things at the intersection of infrastructure and AI.
            Currently exploring the frontiers of cloud-based coding agents.
            Previously led core work at{" "}
            <DottedLink href="#">Company A</DottedLink> and{" "}
            <DottedLink href="#">Company B</DottedLink>.
          </p>
          <p>
            At the end of the day, I&apos;m still that kid who grew up playing
            with my parents&apos; Macintosh and ripping CDs for my friends.
          </p>
        </section>

        <Section title="Writing">
          <ItemLink href="#">Strange Faces</ItemLink>
          <ItemLink href="#">Imagination</ItemLink>
          <ItemLink href="#">Local Models</ItemLink>
        </Section>

        <Section title="Work">
          <ItemLink href="#">Company A — Senior Engineer</ItemLink>
          <ItemLink href="#">Company B — Infrastructure Lead</ItemLink>
        </Section>

        <Section title="Projects">
          <ItemLink href="#">Local AI models on Kubernetes</ItemLink>
          <ItemLink href="#">MCP Server Implementation</ItemLink>
          <ItemLink href="#">Watcher in the Water</ItemLink>
        </Section>

        <Section title="Recently Played">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded bg-[#222] shrink-0" />
            <div className="flex flex-col text-sm">
              <span className="text-[#e5e5e5]">
                Together Is A Beautiful Place To Be - Nala Sinephro Remix
              </span>
              <span className="text-[#737373]">
                Nubya Garcia, Nala Sinephro
              </span>
            </div>
          </div>
        </Section>

        <section className="mt-10 text-[15px] leading-7 text-[#a3a3a3]">
          <p>
            You can read my <DottedLink href="#">writing</DottedLink>,{" "}
            <DottedLink href="#">bookmarks</DottedLink>,{" "}
            <DottedLink href="#">booklist</DottedLink>,{" "}
            <DottedLink href="#">newsletter</DottedLink>,{" "}
            <DottedLink href="#">code</DottedLink>, or{" "}
            <DottedLink href="#">follow me online</DottedLink>. I also angel
            invest in startups, so please{" "}
            <DottedLink href="#">reach out</DottedLink> if interested.
          </p>
        </section>

        <footer className="mt-20 flex items-center justify-between text-sm text-[#525252]">
          <span>
           Kenichiro Goto <span className="text-[#737373]">@frinfo702</span>
          </span>
          <a href="#" className="hover:text-[#a3a3a3] transition-colors">
            Source
          </a>
        </footer>
      </main>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="text-sm font-semibold text-white mb-3">{title}</h2>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </section>
  );
}

function ItemLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <span className="text-[#525252] mr-1.5">·</span>
      <a
        href={href}
        className="text-[15px] text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors"
      >
        {children}
      </a>
    </li>
  );
}

function DottedLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      className="text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors"
    >
      {children}
    </a>
  );
}
