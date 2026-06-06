import type { ReactNode } from "react";
import {
  TreeStructure,
  ArrowsCounterClockwise,
  Lightning,
  Clipboard,
  Lock,
} from "@phosphor-icons/react";

import { Section } from "../components/ui/Section";
import { Reveal } from "../components/ui/Reveal";

const COPY = {
  kicker: "why it holds",
  title: "The topology is the reliability.",
  intro:
    "Each design choice is a constraint that prevents a class of failure. None of them are coincidental.",
} as const;

type PatternCard = {
  icon: ReactNode;
  label: string;
  description: string;
};

const PATTERNS: PatternCard[] = [
  {
    icon: (
      <TreeStructure
        weight="duotone"
        size={28}
        aria-hidden="true"
        className="text-fg"
      />
    ),
    label: "Hierarchical orchestration",
    description:
      "One agent runs the room. It hands off by name, collects verdicts, and calls the round. No agent acts without being addressed.",
  },
  {
    icon: (
      <ArrowsCounterClockwise
        weight="duotone"
        size={28}
        aria-hidden="true"
        className="text-fg"
      />
    ),
    label: "Adversarial debate",
    description:
      "Actor–Critic by design: Coder proposes, Critic challenges, Coder revises. Agreement under pressure is the only confidence worth trusting.",
  },
  {
    icon: (
      <Lightning
        weight="duotone"
        size={28}
        aria-hidden="true"
        className="text-fg"
      />
    ),
    label: "Event-driven",
    description:
      "The room convenes on the incident signal, not a polling interval. No background churn. No stale state from the previous run.",
  },
  {
    icon: (
      <Clipboard
        weight="duotone"
        size={28}
        aria-hidden="true"
        className="text-fg"
      />
    ),
    label: "Blackboard",
    description:
      "One shared session carries the full thread. Agents read and write to it; they don't message each other directly. The debate is auditable by design.",
  },
  {
    icon: (
      <Lock
        weight="duotone"
        size={28}
        aria-hidden="true"
        className="text-fg"
      />
    ),
    label: "Fail-closed gate",
    description:
      "Below the confidence threshold, nothing ships. If your voice doesn't match your words, nothing ships. The default is hold, not proceed.",
  },
];

function Card({
  card,
  delay,
}: {
  card: PatternCard;
  delay: number;
}) {
  return (
    <Reveal delay={delay} y={12}>
      <div className="flex flex-col gap-4 rounded-card border border-line bg-surface p-6 shadow-card">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fg/[0.04]">
          {card.icon}
        </div>
        <div>
          <p className="font-mono text-xs font-medium uppercase tracking-[0.15em] text-muted">
            {card.label}
          </p>
        </div>
        <p className="text-sm leading-relaxed text-muted">{card.description}</p>
      </div>
    </Reveal>
  );
}

export function Patterns() {
  return (
    <Section
      id="patterns"
      kicker={COPY.kicker}
      title={COPY.title}
      intro={COPY.intro}
    >
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {PATTERNS.map((card, i) => (
          <Card key={card.label} card={card} delay={i * 0.07} />
        ))}
      </div>
    </Section>
  );
}
