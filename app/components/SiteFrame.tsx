import LocalTime from "./LocalTime";

export default function SiteFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="site-shell">
      <main className="site-main">{children}</main>
      <footer className="site-footer">
        <LocalTime />
      </footer>
    </div>
  );
}
