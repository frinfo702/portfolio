import Link from "next/link";
import { SOCIAL_LINKS } from "../../lib/external-links";

const NAV = [
  { href: "/#profile", label: "Profile" },
  { href: "/#record", label: "Record" },
  { href: "/#writing", label: "Log" },
  { href: "/#contact", label: "Contact" },
] as const;

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="hud-bar">
        <Link className="hud-mark" href="/">
          K.Goto
        </Link>
        <nav aria-label="Primary">
          <ul>
            {NAV.map((item) => (
              <li key={item.href}>
                <Link href={item.href}>{item.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      </header>
      <div className="hud-frame" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <main id="main" className="site-main">
        {children}
      </main>
      <footer className="site-footer">
        <span>© {new Date().getFullYear()} Kenichiro Goto</span>
        <ul>
          {SOCIAL_LINKS.map((link) => {
            const external = link.href.startsWith("http");
            return (
              <li key={link.href}>
                <a
                  href={link.href}
                  {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
                >
                  {link.label}
                </a>
              </li>
            );
          })}
        </ul>
      </footer>
    </>
  );
}
