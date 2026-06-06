import { SITE } from "../lib/site";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { Container } from "../components/ui/Container";
import { LiveRoom } from "../components/LiveRoom";
import { Reveal } from "../components/ui/Reveal";

const COPY = {
  kicker: "for on-call engineers",
  headlineTop: "Your incident, argued out loud.",
  headlineBottom: "Shipped the moment you sound sure.",
  sub: "A room of specialist agents convenes in your Telegram group, debates the fix in distinct voices, and rolls out only after you approve by voice.",
  primary: "Try it in Telegram",
  secondary: "See how it works",
  detail: "text + voice notes · no dashboards · approve by voice",
} as const;

export function Hero() {
  return (
    <section id="top" className="relative scroll-mt-16">
      <Container className="grid min-h-[calc(100svh-4rem)] items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-24">
        <div className="max-w-xl">
          <Reveal y={12}>
            <Chip tone="neutral">{COPY.kicker}</Chip>
          </Reveal>

          <Reveal delay={0.08} y={14}>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.04] tracking-tighter2 text-fg sm:text-6xl lg:text-7xl">
              {COPY.headlineTop}
              <br />
              <span className="text-muted">{COPY.headlineBottom}</span>
            </h1>
          </Reveal>

          <Reveal delay={0.16} y={14}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              {COPY.sub}
            </p>
          </Reveal>

          <Reveal delay={0.24} y={14}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href={SITE.telegramUrl}>{COPY.primary}</Button>
              <Button variant="ghost" href="#how">
                {COPY.secondary}
              </Button>
            </div>
          </Reveal>

          <Reveal delay={0.32} y={12}>
            <p className="mt-8 font-mono text-xs tracking-tightish text-muted">
              {COPY.detail}
            </p>
          </Reveal>
        </div>

        <Reveal delay={0.2} y={20} className="lg:pl-4">
          <LiveRoom />
        </Reveal>
      </Container>
    </section>
  );
}
