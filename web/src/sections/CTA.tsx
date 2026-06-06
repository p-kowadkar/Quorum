import { GithubLogo } from "@phosphor-icons/react";

import { Button } from "../components/ui/Button";
import { Container } from "../components/ui/Container";
import { Reveal } from "../components/ui/Reveal";
import { SITE } from "../lib/site";

const HEADLINE = "Bring the whole room into your on-call.";
const SUBLINE = "no dashboard to learn · it's just your group chat";

export function CTA() {
  return (
    <section aria-labelledby="cta-heading" className="py-24 sm:py-32">
      <Container>
        <div className="panel-grid relative overflow-hidden rounded-card bg-panel px-8 py-16 shadow-panel sm:px-12 sm:py-20">
          {/* subtle vignette edge fade */}
          <div
            className="pointer-events-none absolute inset-0 rounded-card"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 100%, rgba(4,120,87,0.08) 0%, transparent 70%)",
            }}
            aria-hidden="true"
          />

          <div className="relative flex flex-col items-center text-center">
            <Reveal>
              <h2
                id="cta-heading"
                className="font-display text-3xl font-semibold leading-[1.08] tracking-tightish text-panel-fg sm:text-[2.6rem]"
              >
                {HEADLINE}
              </h2>
            </Reveal>

            <Reveal delay={0.08}>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-panel-muted">
                Quorum lives in Telegram — not a SaaS dashboard you brief your team on.
                When an alert fires, the agents are already in the room your engineers
                check first.
              </p>
            </Reveal>

            <Reveal delay={0.16}>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
                <Button href={SITE.githubUrl} variant="ghost">
                  <GithubLogo size={16} weight="duotone" aria-hidden="true" />
                  View the source
                  <span className="sr-only">(opens in new tab)</span>
                </Button>
              </div>
            </Reveal>

            <Reveal delay={0.22}>
              <p className="mt-6 font-mono text-xs text-panel-muted/60">{SUBLINE}</p>
            </Reveal>
          </div>
        </div>
      </Container>
    </section>
  );
}
