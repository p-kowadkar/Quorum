import { UsersThree } from "@phosphor-icons/react";

import { SITE } from "../lib/site";
import { Button } from "./ui/Button";
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
          className="group inline-flex items-center gap-2 rounded-pill focus:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
        >
          <UsersThree
            weight="duotone"
            className="h-5 w-5 text-resolve"
            aria-hidden="true"
          />
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

        <Button href={SITE.telegramUrl}>Try in Telegram</Button>
      </Container>
    </header>
  );
}
