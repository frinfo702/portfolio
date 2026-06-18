import Image from "next/image";
import ParticleField from "./components/ParticleField";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <ParticleField />
      <main className="relative z-10 flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        <header className="flex items-center justify-between mb-16">
          <h1 className="text-base font-semibold text-white">Kenichiro Goto</h1>
        </header>

        <p className="text-[15px] leading-7 text-[#a3a3a3] mb-2">
          Final-year Information Science student at Ritsumeikan University,
          working on generative AI and building backend/infrastructure systems.
        </p>

        <Section title="Experience">
          <Entry
            title="Backend & Infrastructure Engineer"
            org="CyberAgent"
            href="https://www.cyberagent.co.jp/"
            period="—"
            description="Worked on backend and infrastructure systems."
          />
          <Entry
            title="Backend & Infrastructure Engineer"
            org="pixiv"
            href="https://www.pixiv.co.jp/"
            period="—"
            description="Worked on backend and infrastructure systems."
          />
        </Section>

        <Section title="Education">
          <Entry
            title="B.E. in Information Science and Engineering"
            org="Ritsumeikan University"
            href="https://www.ritsumei.ac.jp/"
            period="Final year"
            description="Nishikawa Laboratory, generative AI research."
          />
        </Section>

        <Section title="Projects">
          <ItemLink href="https://github.com/frinfo702/codex">codex</ItemLink>
          <ItemLink href="https://github.com/frinfo702/english-test-generator">
            english-test-generator
          </ItemLink>
          <ItemLink href="https://github.com/frinfo702/myquartz">
            myquartz
          </ItemLink>
        </Section>

        <Section title="Skills">
          <li className="text-[15px] text-[#a3a3a3]">
            Deep learning, distributed systems, coding agents, ML systems &
            infrastructure.
          </li>
          <li className="text-[15px] text-[#a3a3a3]">
            TOEIC L&amp;R 855.
          </li>
        </Section>

        <Section title="Lately">
          <LatelyItem
            src="/BTS_-_Arirang_(cover).png"
            alt="BTS - 2.0"
            title="2.0"
            subtitle="BTS"
          />
          <LatelyItem
            src="/jjk-season3.png"
            alt="Jujutsu Kaisen season 3"
            title="Jujutsu Kaisen"
            subtitle="Season 3"
          />
        </Section>

        <Section title="Contact">
          <ItemLink href="resume/en.pdf">Resume</ItemLink>
          <ItemLink href="https://github.com/frinfo702">GitHub</ItemLink>
          <ItemLink href="mailto:frinfo702@gmail.com">Email</ItemLink>
        </Section>

        <footer className="mt-20 flex items-center justify-between text-sm text-[#525252]">
          <span>
            Kenichiro Goto <span className="text-[#737373]">@frinfo702</span>
          </span>
          <a
            href="https://github.com/frinfo702"
            className="hover:text-[#a3a3a3] transition-colors"
          >
            GitHub
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
      <ul className="flex flex-col gap-4">{children}</ul>
    </section>
  );
}

function Entry({
  title,
  org,
  href,
  period,
  description,
}: {
  title: string;
  org: string;
  href: string;
  period: string;
  description: string;
}) {
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-white font-medium">
          {title}
        </span>
        <span className="text-xs text-[#737373] shrink-0">{period}</span>
      </div>
      <a
        href={href}
        className="text-sm text-[#a3a3a3] border-b border-dotted border-[#525252] hover:text-white hover:border-[#a3a3a3] transition-colors w-fit"
      >
        {org}
      </a>
      <p className="text-sm text-[#a3a3a3] leading-6 mt-0.5">{description}</p>
    </li>
  );
}

function ItemLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
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

function LatelyItem({
  src,
  alt,
  title,
  subtitle,
}: {
  src: string;
  alt: string;
  title: string;
  subtitle: string;
}) {
  return (
    <li className="flex items-center gap-3">
      <Image
        src={src}
        alt={alt}
        width={40}
        height={40}
        className="h-10 w-10 rounded object-cover shrink-0"
      />
      <div className="flex flex-col text-sm">
        <span className="text-[#e5e5e5]">{title}</span>
        <span className="text-[#737373]">{subtitle}</span>
      </div>
    </li>
  );
}
