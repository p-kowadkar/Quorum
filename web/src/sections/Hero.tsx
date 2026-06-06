import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

import { LiveRoom } from "../components/LiveRoom";
import { Button } from "../components/ui/Button";
import { Chip } from "../components/ui/Chip";
import { Container } from "../components/ui/Container";
import { EASE_EXPO } from "../lib/theme";

const COPY = {
  kicker: "for on-call engineers",
  headlineTop: "Your incident, argued out loud.",
  headlineBottom: "Shipped the moment you sound sure.",
  sub: "A room of specialist agents convenes in your Telegram group, debates the fix in distinct voices, and rolls out only after you approve by voice.",
  secondary: "See how it works",
  detail: "text + voice notes · no dashboards · approve by voice",
} as const;

// The headline and the chat pane share a beat (HEADLINE); supporting copy
// follows in a quick, restrained stagger.
const BEAT = {
  kicker: 0.08,
  headline: 0.18,
  sub: 0.42,
  cta: 0.58,
  detail: 0.72,
} as const;

function Beat({
  delaySec = 0,
  className = "",
  children,
}: {
  delaySec?: number;
  className?: string;
  children: ReactNode;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delaySec, duration: 0.55, ease: EASE_EXPO }}
    >
      {children}
    </motion.div>
  );
}

export function Hero() {
  return (
    <section id="top" className="relative scroll-mt-16">
      <Container className="grid min-h-[calc(100svh-4rem)] items-center gap-14 py-16 sm:py-20 lg:grid-cols-[1.05fr_0.95fr] lg:gap-12 lg:py-24">
        <div className="max-w-xl">
          <Beat delaySec={BEAT.kicker}>
            <Chip tone="neutral">{COPY.kicker}</Chip>
          </Beat>

          <Beat delaySec={BEAT.headline}>
            <h1 className="mt-6 font-display text-5xl font-semibold leading-[1.04] tracking-tighter2 text-fg sm:text-6xl lg:text-7xl">
              {COPY.headlineTop}
              <br />
              <span className="text-muted">{COPY.headlineBottom}</span>
            </h1>
          </Beat>

          <Beat delaySec={BEAT.sub}>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted">
              {COPY.sub}
            </p>
          </Beat>

          <Beat delaySec={BEAT.cta}>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button variant="ghost" href="#how">
                {COPY.secondary}
              </Button>
            </div>
          </Beat>

          <Beat delaySec={BEAT.detail}>
            <p className="mt-8 font-mono text-xs tracking-tightish text-muted">
              {COPY.detail}
            </p>
          </Beat>
        </div>

        {/* same beat as the headline — they arrive together */}
        <Beat delaySec={BEAT.headline} className="lg:pl-4">
          <LiveRoom />
        </Beat>
      </Container>
    </section>
  );
}
