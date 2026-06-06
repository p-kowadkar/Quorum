import { motion, useReducedMotion } from "framer-motion";
import {
  Bell,
  ChatsTeardrop,
  CheckCircle,
  GitPullRequest,
  Scales,
  Microphone,
} from "@phosphor-icons/react";

import { Chip } from "../components/ui/Chip";
import { Reveal } from "../components/ui/Reveal";
import { Section } from "../components/ui/Section";
import { EASE_EXPO } from "../lib/theme";

const TITLE = "From alert to resolved — inside Telegram.";
const INTRO =
  "No war-room tab switching. Every step happens in the group chat your team already lives in.";

const STEPS = [
  {
    icon: Bell,
    label: "Alert fires",
    detail: "NightOwl detects a P1 spike and drops a structured payload into the channel.",
  },
  {
    icon: ChatsTeardrop,
    label: "The room convenes",
    detail: "Orchestrator, RootCause, Coder, and Critic join — each posting under their own name.",
  },
  {
    icon: Scales,
    label: "Debate to a verdict",
    detail: "Agents challenge each other publicly. Critic signs off: confidence 0.78, proceed.",
  },
  {
    icon: Microphone,
    label: "You approve by voice",
    detail: 'Send a voice note: "looks good, ship it." The bot transcribes and gates the deploy.',
  },
  {
    icon: GitPullRequest,
    label: "Rollback + paper trail",
    detail: "Fix lands, a GitHub issue is opened with the full debate log attached.",
  },
  {
    icon: CheckCircle,
    label: "Status flips",
    detail: "The incident closes. The channel sees the final status.",
  },
] as const;

function StepNode({
  step,
  index,
  totalSteps,
}: {
  step: (typeof STEPS)[number];
  index: number;
  totalSteps: number;
}) {
  const Icon = step.icon;
  const isLast = index === totalSteps - 1;

  return (
    <Reveal delay={index * 0.08} className="flex flex-col items-center text-center lg:flex-1">
      {/* connector line: visible only on lg between nodes */}
      <div className="flex w-full items-center lg:relative">
        {/* left arm */}
        <div
          className={`hidden h-px flex-1 bg-line lg:block ${index === 0 ? "opacity-0" : ""}`}
        />
        {/* node circle */}
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-card">
          <Icon size={20} weight="duotone" className="text-fg/70" aria-hidden="true" />
        </div>
        {/* right arm */}
        <div
          className={`hidden h-px flex-1 bg-line lg:block ${isLast ? "opacity-0" : ""}`}
        />
      </div>

      {/* label + detail */}
      <div className="mt-4 px-2">
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-mono text-[10px] tabular-nums text-muted">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-sm font-semibold text-fg">{step.label}</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">{step.detail}</p>
      </div>
    </Reveal>
  );
}

function StatusStep({ index }: { index: number }) {
  const reduce = useReducedMotion();

  return (
    <Reveal delay={index * 0.08} className="flex flex-col items-center text-center lg:flex-1">
      <div className="flex w-full items-center lg:relative">
        <div className="hidden h-px flex-1 bg-line lg:block" />
        <div className="relative z-10 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-line bg-surface shadow-card">
          <CheckCircle size={20} weight="duotone" className="text-resolve/80" aria-hidden="true" />
        </div>
        <div className="hidden h-px flex-1 bg-line opacity-0 lg:block" />
      </div>

      <div className="mt-4 px-2">
        <div className="flex items-center justify-center gap-1.5">
          <span className="font-mono text-[10px] tabular-nums text-muted">{String(index + 1).padStart(2, "0")}</span>
          <span className="text-sm font-semibold text-fg">Status flips</span>
        </div>
        <p className="mt-1.5 text-xs leading-relaxed text-muted">
          The incident closes. The channel sees the final status.
        </p>
        {/* animated status pill */}
        <div className="mt-3 flex justify-center">
          {reduce ? (
            <Chip tone="resolve">mitigated</Chip>
          ) : (
            <StatusPillInView />
          )}
        </div>
      </div>
    </Reveal>
  );
}

function StatusPillInView() {
  return (
    <motion.div
      initial={false}
      whileInView="resolved"
      viewport={{ once: true, margin: "-60px" }}
      variants={{
        resolved: {},
      }}
    >
      <StatusPillAnimated />
    </motion.div>
  );
}

function StatusPillAnimated() {
  return (
    <motion.span
      className="inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 font-mono text-xs font-medium"
      initial={{ backgroundColor: "#FEF3C7", color: "#B45309" }}
      whileInView={{ backgroundColor: "#D1FAE5", color: "#047857" }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.4 }}
    >
      <motion.span
        className="inline-block h-1.5 w-1.5 rounded-full"
        initial={{ backgroundColor: "#B45309" }}
        whileInView={{ backgroundColor: "#047857" }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.8, ease: EASE_EXPO, delay: 0.4 }}
      />
      <motion.span
        initial={{ opacity: 1 }}
        whileInView={{ opacity: 1 }}
      >
        mitigated
      </motion.span>
    </motion.span>
  );
}

const STEPS_WITHOUT_LAST = STEPS.slice(0, STEPS.length - 1);

export function Flow() {
  return (
    <Section
      id="flow"
      kicker="the walk"
      title={TITLE}
      intro={INTRO}
    >
      {/* vertical on mobile, horizontal grid on lg */}
      <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-0">
        {STEPS_WITHOUT_LAST.map((step, i) => (
          <StepNode key={step.label} step={step} index={i} totalSteps={STEPS.length} />
        ))}
        <StatusStep index={STEPS.length - 1} />
      </div>
    </Section>
  );
}
