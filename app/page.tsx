import Image from "next/image";
import CadAssembly from "./components/CadAssembly";

export default function Home() {
  return (
    <div className="pl-layout">
      <SideNav />
      <main className="pl-main">
        <header className="pl-hero">
          <h1>Kenichiro Goto</h1>
          <p>
            Software engineer &amp; machine-learning researcher. Backend &amp;
            infrastructure by day, deep learning by night.
          </p>
        </header>

        <div className="pl-hero-scene">
          <CadAssembly />
        </div>

        <Section id="experience" title="Experience" code="exp">
          <CardEntry
            title="Software Engineer Internship — Backend & Infrastructure"
            org="CyberAgent"
            href="https://www.cyberagent.co.jp/"
            period="2025-08 — 2025-09"
            description="Backend and infrastructure systems."
          />
          <CardEntry
            title="Software Engineer Internship — Backend"
            org="pixiv Inc."
            href="https://www.pixiv.co.jp/"
            period="2025-06 — current"
            description="Backend and infrastructure systems."
          />
          <CardEntry
            title="Software Engineer Internship — Backend"
            org="Finatext Holdings Ltd."
            href="https://finatext.com/"
            period="2025-01 — 2025-05"
            description="Backend and infrastructure systems."
          />
        </Section>

        <Section id="education" title="Education" code="edu">
          <CardEntry
            title="B.E. Information Science and Engineering"
            org="Ritsumeikan University"
            href="https://www.ritsumei.ac.jp/"
            period="2023-04 — 2027-03"
            description="Computational Intelligence Lab · computer vision research."
          />
        </Section>

        <Section id="accomplishments" title="Accomplishments" code="acr">
          <SubLabel>Honors</SubLabel>
          <CardEntry
            title="Saionji Memorial Scholarship"
            org="Ritsumeikan University"
            href="https://www.ritsumei.ac.jp/"
            period="2026-07"
            description={
              <>
                <span className="text-tertiary">$2,000</span> · excellent
                grades
              </>
            }
          />
          <SubLabel className="mt-4">Certification</SubLabel>
          <CardEntry
            title="TOEIC L&R"
            org="ETS"
            href="https://www.ets.org/toeic/"
            period="2026-04"
            description="Score 855"
          />
          <CardEntry
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
          <LinkRow
            href="https://github.com/frinfo702/english-test-generator"
            label="english-test-generator"
            type="ext"
          />
        </Section>

        <Section id="lately" title="Lately" code="lat">
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
        </Section>

        <Section id="contact" title="Contact" code="ctc">
          <LinkRow
            href="mailto:kenichiro3114@gmail.com"
            label="kenichiro3114@gmail.com"
            type="mail"
          />
          <LinkRow
            href="https://www.linkedin.com/in/kenichiro-goto/"
            label="linkedin.com/in/kenichiro-goto"
            type="ext"
            icon={<LinkedInIcon />}
          />
        </Section>

        <Section id="links" title="Link" code="lnk">
          <LinkRow
            href="https://github.com/frinfo702"
            label="github.com/frinfo702"
            type="ext"
            icon={<GitHubIcon />}
          />
          <LinkRow
            href="resume/kenichiro_goto.pdf"
            label="resume.pdf"
            type="file"
          />
          <LinkRow
            href="/docs/"
            label="Writing (including blog)"
            type="guide"
          />
        </Section>

        <footer className="pl-footer">
          <p>© {new Date().getFullYear()} Kenichiro Goto</p>
        </footer>
      </main>
    </div>
  );
}

function SideNav() {
  const tree = [
    { id: "experience", label: "experience" },
    { id: "education", label: "education" },
    { id: "accomplishments", label: "honors" },
    { id: "skills", label: "skills" },
    { id: "projects", label: "projects" },
    { id: "lately", label: "lately" },
    { id: "contact", label: "contact" },
    { id: "links", label: "link" },
  ];

  const external = [
    { href: "resume/kenichiro_goto.pdf", label: "resume.pdf" },
    { href: "https://github.com/frinfo702", label: "github" },
    { href: "https://www.linkedin.com/in/kenichiro-goto/", label: "linkedin" },
    { href: "/docs/", label: "docs/" },
    { href: "mailto:kenichiro3114@gmail.com", label: "email" },
  ];

  return (
    <nav className="pl-nav" aria-label="Outliner">
      <div className="pl-nav-inner">
        <a
          href="#experience"
          className="pl-nav-link pl-active"
        >
          portfolio
        </a>
        {tree.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="pl-nav-link"
          >
            {s.label}
          </a>
        ))}
        <div className="pl-nav-external">
          {external.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="pl-nav-link"
              {...(l.href.startsWith("http")
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
            >
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
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
    <section id={id} className="pl-section scroll-mt-6">
      <div className="pl-section-title">
        <h2>{title}</h2>
        <span>{code}</span>
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
      className={`mb-2 font-mono text-[0.75rem] font-medium uppercase tracking-[0.05em] text-tertiary ${className}`}
    >
      {children}
    </h3>
  );
}

function CardEntry({
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
    <div className="pl-card mb-3">
      <div className="pl-card-header">
        <div>
          <div className="pl-card-title">{title}</div>
          <a
            href={href}
            className="pl-card-org"
            target="_blank"
            rel="noopener noreferrer"
          >
            {org}
          </a>
        </div>
        <span className="pl-card-period">{period}</span>
      </div>
      <p className="pl-card-description">{description}</p>
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
    <div className="pl-skill-group">
      <div className="pl-skill-label">{label}</div>
      <ul className="pl-skill-list">{children}</ul>
    </div>
  );
}

function SkillItem({ children }: { children: React.ReactNode }) {
  return (
    <li>
      <span className="pl-skill-chip">{children}</span>
    </li>
  );
}

function LinkRow({
  href,
  label,
  type,
  icon,
}: {
  href: string;
  label: string;
  type: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="pl-link-row">
      <a
        href={href}
        className="inline-flex items-center gap-1.5"
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {icon}
        {label}
      </a>
      <span className="pl-link-type">{type}</span>
    </div>
  );
}

function LinkedInIcon() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
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
      className="h-4 w-4 shrink-0"
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
    <div className="pl-lately-item">
      <div className="pl-lately-thumb">
        <Image
          src={src}
          alt={alt}
          width={40}
          height={40}
          className="h-full w-full object-cover"
        />
      </div>
      <span className="pl-lately-title">{title}</span>
      <span className="pl-lately-subtitle">{subtitle}</span>
    </div>
  );
}
