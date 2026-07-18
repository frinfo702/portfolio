import Link from "next/link";
import { writings } from "../../lib/writing";

export default function WritingPage() {
  return (
    <main className="writing-shell">
      <Link href="/" className="writing-back">
        <BackArrow />
        back
      </Link>

      <header>
        <h1 className="writing-title">Writing</h1>
        <p className="writing-lede">
          Guides and notes — long-form material that sits beside the portfolio.
        </p>
      </header>

      <p className="writing-label">Table of contents</p>

      <ol className="writing-list">
        {writings.map((piece) => (
          <li key={piece.slug}>
            <a className="writing-item" href={piece.href}>
              <span className="writing-item-kind">{piece.kind}</span>
              <span className="writing-item-body">
                <span className="writing-item-title">{piece.title}</span>
                <span className="writing-item-desc">{piece.description}</span>
                <span className="writing-item-date">{piece.date}</span>
              </span>
              <ArrowRight />
            </a>
          </li>
        ))}
      </ol>

      <p className="writing-footer">Kenichiro Goto</p>
    </main>
  );
}

function BackArrow() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m12 19-7-7 7-7" />
      <path d="M19 12H5" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg
      className="writing-item-arrow"
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}
