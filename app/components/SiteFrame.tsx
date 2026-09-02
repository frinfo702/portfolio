import Link from "next/link";
import { GeistPixelSquare } from "geist/font/pixel";
import { SOCIAL_LINKS } from "../../lib/external-links";

const SOCIAL_ICONS: Record<string, () => React.ReactNode> = {
  email: MailIcon,
  github: GitHubIcon,
  linkedin: LinkedInIcon,
};

type PageName = "about" | "writing" | "misc";

const pages = [
  { name: "about", href: "/", label: "About" },
  { name: "writing", href: "/writing", label: "Writing" },
  { name: "misc", href: "/misc", label: "Misc" },
] as const;

export default function SiteFrame({
  active,
  children,
}: {
  active: PageName;
  children: React.ReactNode;
}) {
  return (
    <div className="site-shell">
      <aside className="site-sidebar">
        <div className="sidebar-sticky">
          <h1 className={`site-title mobile-title ${GeistPixelSquare.variable}`}>
            <Link href="/" className="geist-pixel">
              Kenichiro Goto
            </Link>
          </h1>
          <nav className="site-nav" aria-label="Primary navigation">
            {pages.map((page) => (
              <Link
                key={page.name}
                href={page.href}
                className={
                  active === page.name ? "nav-link active" : "nav-link"
                }
                aria-current={active === page.name ? "page" : undefined}
              >
                <span className="nav-dot" aria-hidden="true" />
                {page.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      <main className="site-main">
        <h1 className={`site-title desktop-title ${GeistPixelSquare.variable}`}>
          <Link href="/" className="geist-pixel">
            Kenichiro Goto
          </Link>
        </h1>
        <div className="site-content">{children}</div>
        <Footer />
      </main>
    </div>
  );
}

function Footer() {
  return (
    <footer className="site-footer">
      <span>© {new Date().getFullYear()} Kenichiro Goto.</span>
      <div className="social-links">
        {SOCIAL_LINKS.map((link) => {
          const Icon = SOCIAL_ICONS[link.label];
          if (!Icon) return null;
          const external = link.href.startsWith("http");
          return (
            <a
              key={link.href}
              href={link.href}
              {...(external
                ? { target: "_blank", rel: "noreferrer" }
                : {})}
              aria-label={link.label}
            >
              <Icon />
            </a>
          );
        })}
      </div>
    </footer>
  );
}

function MailIcon() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true">
      <path d="M2 5.9 10 10l8-4.1A2 2 0 0 0 16 4H4a2 2 0 0 0-2 1.9Zm16 2.2-8 4-8-4V14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8.1Z" />
    </svg>
  );
}

function GitHubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2.3c-3.3.7-4-1.4-4-1.4-.5-1.4-1.3-1.7-1.3-1.7-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.4 11.4 0 0 1 6 0c2.3-1.6 3.3-1.2 3.3-1.2.7 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3Z" />
    </svg>
  );
}

function LinkedInIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20.4 20.5h-3.5v-5.6c0-1.3 0-3-1.9-3s-2.1 1.4-2.1 2.9v5.7H9.3V9h3.4v1.6h.1a3.7 3.7 0 0 1 3.4-1.9c3.6 0 4.2 2.4 4.2 5.5v6.3ZM5.3 7.4a2.1 2.1 0 1 1 0-4.1 2.1 2.1 0 0 1 0 4.1Zm1.8 13.1H3.6V9h3.5v11.5ZM22.2 0H1.8C.8 0 0 .8 0 1.7v20.6c0 .9.8 1.7 1.8 1.7h20.4c1 0 1.8-.8 1.8-1.7V1.7C24 .8 23.2 0 22.2 0Z" />
    </svg>
  );
}
