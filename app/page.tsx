import Image from "next/image";

export default function Home() {
  return (
    <div className="zen-app min-h-full">
      <main className="zen-main min-h-screen overflow-y-auto">
        <div className="zen-content mx-auto max-w-[42rem] px-4 py-10 sm:px-6 sm:py-16">
          <header id="identity" className="zen-identity scroll-mt-6 mb-8">
            <h1 className="mb-2 font-sans text-[1.7rem] font-medium tracking-tight text-white sm:text-[1.85rem]">
              Kenichiro Goto
            </h1>
            <p className="max-w-[38em] font-sans text-[14px] leading-relaxed text-muted">
              Software engineer &amp; machine-learning researcher. Backend &amp;
              infrastructure by day, deep learning by night.
            </p>

            <dl className="mt-4 grid grid-cols-1 gap-px border border-line bg-line sm:grid-cols-3">
              <Prop k="role" v="engineer · ml" />
              <Prop k="focus" v="backend · cv" />
              <Prop k="status" v="active" />
            </dl>
          </header>

          <Section id="experience" title="Experience" code="exp">
            <Entry
              title="Software Engineer Internship — Backend & Infrastructure"
              org="CyberAgent"
              href="https://www.cyberagent.co.jp/"
              period="2025-08 — 2025-09"
              description="Backend and infrastructure systems."
            />
            <Entry
              title="Software Engineer Internship — Backend"
              org="pixiv Inc."
              href="https://www.pixiv.co.jp/"
              period="2025-06 — current"
              description="Backend and infrastructure systems."
            />
            <Entry
              title="Software Engineer Internship — Backend"
              org="Finatext Holdings Ltd."
              href="https://finatext.com/"
              period="2025-01 — 2025-05"
              description="Backend and infrastructure systems."
            />
          </Section>

          <Section id="education" title="Education" code="edu">
            <Entry
              title="B.E. Information Science and Engineering"
              org="Ritsumeikan University"
              href="https://www.ritsumei.ac.jp/"
              period="2023-04 — 2027-03"
              description="Computational Intelligence Lab · computer vision research."
            />
          </Section>

          <Section id="accomplishments" title="Accomplishments" code="acr">
            <SubLabel>Honors</SubLabel>
            <Entry
              title="Saionji Memorial Scholarship"
              org="Ritsumeikan University"
              href="https://www.ritsumei.ac.jp/"
              period="2026-07"
              description={
                <>
                  <span className="text-[#7a7a7a]">$2,000</span> · excellent
                  grades
                </>
              }
            />
            <SubLabel className="mt-4">Certification</SubLabel>
            <Entry
              title="TOEIC L&R"
              org="ETS"
              href="https://www.ets.org/toeic/"
              period="2026-04"
              description="Score 855"
            />
            <Entry
              title="TOEFL iTP"
              org="ETS"
              href="https://www.ets.org/toefl/"
              period="2026-06"
              description="Score 567"
            />
          </Section>

          <Section id="skills" title="Skills" code="skl">
            <SkillGroup label="domains">
              <SkillItem>Machine Learning</SkillItem>
              <SkillItem>Computer Vision</SkillItem>
              <SkillItem>Software Engineering</SkillItem>
              <SkillItem>Systems architecture</SkillItem>
              <SkillItem>Infrastructure</SkillItem>
            </SkillGroup>
            <SkillGroup label="languages">
              <SkillItem>Go</SkillItem>
              <SkillItem>Scala</SkillItem>
              <SkillItem>Python</SkillItem>
              <SkillItem>Shell</SkillItem>
            </SkillGroup>
            <SkillGroup label="frameworks">
              <SkillItem>Echo</SkillItem>
              <SkillItem>Play Framework</SkillItem>
              <SkillItem>PyTorch</SkillItem>
            </SkillGroup>
            <SkillGroup label="cloud">
              <SkillItem>GCP</SkillItem>
              <SkillItem>AWS</SkillItem>
            </SkillGroup>
            <SkillGroup label="tools">
              <SkillItem>Git</SkillItem>
              <SkillItem>Docker</SkillItem>
              <SkillItem>Terraform</SkillItem>
              <SkillItem>Linux</SkillItem>
              <SkillItem>vim</SkillItem>
              <SkillItem>helix</SkillItem>
            </SkillGroup>
            <SkillGroup label="databases">
              <SkillItem>MySQL</SkillItem>
              <SkillItem>PostgreSQL</SkillItem>
              <SkillItem>SQLite</SkillItem>
            </SkillGroup>
          </Section>

          <Section id="projects" title="Projects" code="prj">
            <ul>
              <li className="sx-row">
                <a
                  href="https://github.com/frinfo702/english-test-generator"
                  className="sx-link text-[13.5px]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  english-test-generator
                </a>
                <span className="font-mono text-[11px] text-[#777]">ext</span>
              </li>
            </ul>
          </Section>

          <Section id="lately" title="Lately" code="lat">
            <ul className="flex flex-col">
              <LatelyItem
                src="/yomi_no_tsugai.jpeg"
                alt="Yomi no Tsugai"
                title="Yomi no Tsugai"
                subtitle="S1"
              />
              <LatelyItem
                src="/jjk-season3.png"
                alt="Jujutsu Kaisen season 3"
                title="Jujutsu Kaisen"
                subtitle="S3"
              />
              <LatelyItem
                src="/redred.png"
                alt="REDRED"
                title="REDRED"
                subtitle="CORTIS"
              />
            </ul>
          </Section>

          <Section id="contact" title="Contact" code="ctc">
            <ul>
              <li className="sx-row">
                <a
                  href="mailto:kenichiro3114@gmail.com"
                  className="sx-link inline-flex items-center gap-1.5 text-[13.5px]"
                >
                  kenichiro3114@gmail.com
                </a>
                <span className="font-mono text-[11px] text-[#777]">mail</span>
              </li>
              <li className="sx-row">
                <a
                  href="https://www.linkedin.com/in/kenichiro-goto/"
                  className="sx-link inline-flex items-center gap-1.5 text-[13.5px]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <LinkedInIcon />
                  linkedin.com/in/kenichiro-goto
                </a>
                <span className="font-mono text-[11px] text-[#777]">ext</span>
              </li>
            </ul>
          </Section>

          <Section id="links" title="Link" code="lnk">
            <ul>
              <li className="sx-row">
                <a
                  href="https://github.com/frinfo702"
                  className="sx-link inline-flex items-center gap-1.5 text-[13.5px]"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <GitHubIcon />
                  github.com/frinfo702
                </a>
                <span className="font-mono text-[11px] text-[#777]">ext</span>
              </li>
              <li className="sx-row">
                <a
                  href="resume/kenichiro_goto.pdf"
                  className="sx-link text-[13.5px]"
                >
                  resume.pdf
                </a>
                <span className="font-mono text-[11px] text-[#777]">file</span>
              </li>
              <li className="sx-row">
                <a href="/docs/" className="sx-link text-[13.5px]">
                  Writing (including blog)
                </a>
                <span className="font-mono text-[11px] text-[#777]">guide</span>
              </li>
            </ul>
          </Section>

          <p className="mt-8 border-t border-line pt-3 font-mono text-[11px] text-[#666]">
            © {new Date().getFullYear()} Kenichiro Goto
          </p>
        </div>
      </main>
    </div>
  );
}

function Prop({ k, v }: { k: string; v: string }) {
  return (
    <div className="bg-black/90 px-3 py-2 backdrop-blur-sm">
      <dt className="font-mono text-[10px] uppercase tracking-[0.12em] text-[#666]">
        {k}
      </dt>
      <dd className="mt-0.5 font-mono text-[12px] text-[#c8c8c8]">{v}</dd>
    </div>
  );
}

function Section({
  id,
  title,
  code,
  children,
}: {
  id: string;
  title: string;
  code: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-6 border-t border-line py-5">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="font-mono text-[10px] font-normal uppercase tracking-[0.16em] text-[#777]">
          {title}
        </h2>
        <span className="font-mono text-[10px] text-[#555]">{code}</span>
      </div>
      {children}
    </section>
  );
}

function SubLabel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3
      className={`mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#666] ${className}`}
    >
      {children}
    </h3>
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
  description: React.ReactNode;
}) {
  return (
    <div className="sx-row !grid-cols-1 gap-0.5 sm:!grid-cols-[1fr_auto] sm:gap-3">
      <div className="min-w-0">
        <div className="font-sans text-[13.5px] text-[#f0f0f0]">{title}</div>
        <a href={href} className="sx-link mt-0.5 inline-block text-[12.5px]">
          {org}
        </a>
        <p className="mt-0.5 text-[12.5px] leading-relaxed text-[#9a9a9a]">
          {description}
        </p>
      </div>
      <div className="shrink-0 font-mono text-[11px] tabular-nums text-[#b0b0b0] sm:pt-0.5 sm:text-right">
        {period}
      </div>
    </div>
  );
}

function SkillGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-3 last:mb-0">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-[#666]">
        {label}
      </div>
      <ul className="flex flex-wrap gap-1.5">{children}</ul>
    </div>
  );
}

function SkillItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="sx-chip">{children}</span>
    </li>
  );
}

function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M20.45 20.45h-3.56v-5.58c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.13 1.44-2.13 2.94v5.68H9.35V8.98h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.26 2.37 4.26 5.46v6.3zM5.34 7.42a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V8.98h3.56v11.47zM22.23 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.46c.98 0 1.77-.77 1.77-1.72V1.72C24 .77 23.21 0 22.23 0z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-3.5 w-3.5 shrink-0"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.1.79-.25.79-.55v-2.1c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.69-1.28-1.69-1.05-.72.08-.71.08-.71 1.15.08 1.75 1.18 1.75 1.18 1.03 1.76 2.7 1.25 3.36.96.1-.75.4-1.25.73-1.54-2.55-.29-5.23-1.28-5.23-5.68 0-1.25.45-2.27 1.18-3.07-.12-.29-.51-1.46.11-3.04 0 0 .96-.31 3.15 1.17a10.9 10.9 0 0 1 5.74 0c2.19-1.48 3.15-1.17 3.15-1.17.62 1.58.23 2.75.11 3.04.73.8 1.18 1.82 1.18 3.07 0 4.41-2.69 5.38-5.25 5.67.41.36.78 1.08.78 2.18v3.23c0 .3.21.66.8.55A11.51 11.51 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
    </svg>
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
    <li className="sx-row items-center !py-2">
      <div className="flex items-center gap-2.5">
        <div className="shrink-0 border border-line">
          <Image
            src={src}
            alt={alt}
            width={28}
            height={28}
            className="h-7 w-7 object-cover"
          />
        </div>
        <span className="font-sans text-[13.5px] text-[#e8e8e8]">{title}</span>
      </div>
      <span className="font-mono text-[11px] text-[#9a9a9a]">{subtitle}</span>
    </li>
  );
}
