import { GithubLogo } from "@phosphor-icons/react";

import { Container } from "./ui/Container";
import { SITE } from "../lib/site";

const NAV_LINKS = [
  { label: "How it works", href: "#how" },
  { label: "Features", href: "#features" },
  { label: "Patterns", href: "#patterns" },
] as const;

const DESCRIPTOR = "Specialist AI agents for production incidents — inside Telegram.";
const BUILT_FOR = "Built for on-call.";
const COPYRIGHT = "© 2026 Quorum";

export function Footer() {
  return (
    <footer className="border-t border-line bg-ink" aria-label="Site footer">
      <Container>
        <div className="flex flex-col gap-8 py-10 sm:flex-row sm:items-start sm:justify-between sm:py-12">
          {/* wordmark + descriptor */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5">
              <img src="/logo.png" alt="Quorum logo" className="h-7 w-7 rounded-md" />
              <span className="font-display text-lg font-semibold tracking-tightish text-fg">
                {SITE.name}
              </span>
            </div>
            <p className="max-w-xs text-sm leading-relaxed text-muted">{DESCRIPTOR}</p>
          </div>

          {/* nav links */}
          <nav aria-label="Footer navigation">
            <ul className="flex flex-wrap gap-x-6 gap-y-2" role="list">
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <a
                    href={href}
                    className="text-sm text-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
                  >
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {/* external links */}
          <div className="flex items-center gap-4">
            <a
              href={SITE.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="text-muted transition-colors duration-150 hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-resolve/40 focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
              aria-label="Quorum on GitHub (opens in new tab)"
            >
              <GithubLogo size={20} weight="duotone" aria-hidden="true" />
            </a>
          </div>
        </div>

        {/* bottom bar */}
        <div className="flex flex-col items-start gap-1 border-t border-line py-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-xs text-muted">{BUILT_FOR}</p>
          <p className="font-mono text-xs text-muted">{COPYRIGHT}</p>
        </div>
      </Container>
    </footer>
  );
}
