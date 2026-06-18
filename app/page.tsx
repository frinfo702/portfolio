import ParticleField from "./components/ParticleField";

const LINK_CLASS =
  "text-[#c7c7c7] border-b border-dotted border-[#888888] hover:text-white hover:border-[#c7c7c7] transition-colors";

const NAV_LINK_CLASS =
  "text-[13px] text-[#888888] hover:text-[#c7c7c7] transition-colors";

export default function Home() {
  return (
    <div className="relative flex flex-col flex-1 items-center bg-black font-sans text-[#e5e5e5]">
      <ParticleField />
      <main className="relative z-10 flex flex-col w-full max-w-xl px-6 py-20 sm:px-8">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-semibold text-white tracking-tight">
              Kenichiro Goto
            </h1>
            <span className="text-[12px] text-[#888888] font-mono">
              @frinfo702
            </span>
          </div>
          <p className="text-[13px] text-[#a8a8a8]">
            Information Science &amp; Engineering · Ritsumeikan University
          </p>
          <nav className="flex flex-wrap items-center gap-4 mt-4">
            <a href="resume/en.pdf" className={NAV_LINK_CLASS}>
              Resume
            </a>
            <a href="https://github.com/frinfo702" className={NAV_LINK_CLASS}>
              GitHub
            </a>
            <a href="mailto:frinfo702@gmail.com" className={NAV_LINK_CLASS}>
              Email
            </a>
          </nav>
        </header>

        {/* About */}
        <Section title="About">
          <p className="text-[15px] leading-7 text-[#c7c7c7]">
            Final-year undergraduate researching generative AI. Focused on deep
            learning, distributed systems, and production ML infrastructure.
          </p>
        </Section>

        {/* Experience */}
        <Section title="Experience">
          <Entry
            org="pixiv"
            orgHref="https://www.pixiv.co.jp/"
            role="Backend / Infrastructure Engineer"
            period="2024 —"
            description="Backend and infrastructure systems."
          />
          <Entry
            org="CyberAgent"
            orgHref="https://www.cyberagent.co.jp/"
            role="Backend / Infrastructure Engineer"
            period="2024"
            description="Backend and infrastructure systems."
          />
        </Section>

        {/* Education */}
        <Section title="Education">
          <Entry
            org="Ritsumeikan University"
            role="B.S. Information Science and Engineering"
            period="2022 — 2026 (Expected)"
            description="Nishikawa Laboratory — generative AI research."
          />
        </Section>

        {/* Projects */}
        <Section title="Projects">
          <ProjectLink
            name="codex"
            href="https://github.com/frinfo702/codex"
          />
          <ProjectLink
            name="english-test-generator"
            href="https://github.com/frinfo702/english-test-generator"
          />
          <ProjectLink
            name="myquartz"
            href="https://github.com/frinfo702/myquartz"
          />
        </Section>

        {/* Skills & Certifications */}
        <Section title="Skills & Certifications">
          <div className="flex flex-col gap-3 text-[15px] text-[#c7c7c7]">
            <div>
              <p className="text-[12px] text-[#888888] uppercase tracking-wider mb-1.5">
                Interests
              </p>
              <div className="flex flex-wrap gap-1.5">
                <Tag>Deep Learning</Tag>
                <Tag>Distributed Systems</Tag>
                <Tag>Coding Agents</Tag>
                <Tag>ML Infrastructure</Tag>
              </div>
            </div>
            <div className="flex items-center justify-between pt-1 border-t border-[#1a1a1a]">
              <span>TOEIC L&amp;R</span>
              <span className="text-white font-medium">855</span>
            </div>
          </div>
        </Section>

        <footer className="mt-16 text-[13px] text-[#888888]">
          <span>Kenichiro Goto</span>
          <span className="mx-2 text-[#484848]">·</span>
          <a
            href="https://github.com/frinfo702"
            className="hover:text-[#c7c7c7] transition-colors"
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
      <h2 className="text-[12px] font-semibold uppercase tracking-wider text-[#a8a8a8] mb-4">
        {title}
      </h2>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  );
}

function Entry({
  org,
  orgHref,
  role,
  period,
  description,
}: {
  org: string;
  orgHref?: string;
  role: string;
  period: string;
  description: string;
}) {
  const orgEl = orgHref ? (
    <a href={orgHref} className={LINK_CLASS}>
      {org}
    </a>
  ) : (
    <span className="text-[#e5e5e5]">{org}</span>
  );

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[15px] text-[#e5e5e5] font-medium">{role}</span>
        <span className="text-[12px] text-[#888888] shrink-0 whitespace-nowrap">
          {period}
        </span>
      </div>
      <div className="text-[13px] text-[#a8a8a8]">{orgEl}</div>
      <p className="text-[13px] text-[#888888] mt-0.5">{description}</p>
    </div>
  );
}

function ProjectLink({ name, href }: { name: string; href: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-2 text-[15px] text-[#c7c7c7] hover:text-white transition-colors"
    >
      <span className="text-[#888888] group-hover:text-[#a8a8a8] transition-colors">
        ·
      </span>
      <span className="border-b border-dotted border-[#888888] group-hover:border-[#c7c7c7] transition-colors">
        {name}
      </span>
      <span className="text-[12px] text-[#888888] font-mono">↗</span>
    </a>
  );
}

function Tag({ children }: { children: React.ReactNode }) {
  return (
    <span className="px-2 py-0.5 text-[12px] text-[#a8a8a8] border border-[#484848] rounded">
      {children}
    </span>
  );
}
