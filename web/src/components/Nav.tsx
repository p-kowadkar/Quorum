import { SITE } from "../lib/site";
import { Container } from "./ui/Container";

const LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Patterns", href: "#patterns" },
] as const;

export function Nav() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/70 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-4">
        <a
          href="#top"
          className="group inline-flex items-center gap-2.5 rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <img src="/logo.png" alt="Quorum logo" className="h-8 w-8 rounded-md" />
          <span className="font-display text-lg font-semibold tracking-tightish text-fg">
            {SITE.name}
          </span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-sm text-sm text-muted transition-colors hover:text-fg focus:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            >
              {link.label}
            </a>
          ))}
        </nav>
      </Container>
    </header>
  );
}
