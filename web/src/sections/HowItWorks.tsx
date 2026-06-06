import {
  Broadcast,
  MagnifyingGlass,
  Code,
  Scales,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";

import { Chip } from "../components/ui/Chip";
import { Reveal } from "../components/ui/Reveal";
import { Section } from "../components/ui/Section";
import { AGENTS, AGENT_ORDER, type AgentKey } from "../lib/theme";

const TITLE = "Four specialists. One shared blackboard.";
const INTRO =
  "Each agent has a distinct job and a distinct voice. " +
  "They read the same session object — the incident trace, prior hypotheses, draft patches — " +
  "and write back to it. No peer-to-peer chatter. No crossed wires.";

const BLACKBOARD_DESC =
  "Every agent reads and writes a single shared session object: " +
  "the raw trace, posted hypotheses, draft patches, and review verdicts. " +
  "The Orchestrator sequences who speaks next. Specialists never talk directly to each other.";

const MODEL_TIER: Record<AgentKey, string> = {
  orchestrator: "mid",
  rootcause: "smart",
  coder: "smart",
  critic: "smart",
};

const AGENT_ICONS: Record<AgentKey, Icon> = {
  orchestrator: Broadcast,
  rootcause: MagnifyingGlass,
  coder: Code,
  critic: Scales,
};

const AGENT_ICON_ARIA: Record<AgentKey, string> = {
  orchestrator: "Broadcast tower icon",
  rootcause: "Magnifying glass icon",
  coder: "Code brackets icon",
  critic: "Scales icon",
};

export function HowItWorks() {
  return (
    <Section id="how" kicker="the cast" title={TITLE} intro={INTRO}>
      {/* Agent cards grid */}
      <div
        className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
        role="list"
        aria-label="Quorum specialist agents"
      >
        {AGENT_ORDER.map((key, i) => {
          const agent = AGENTS[key];
          const IconComponent = AGENT_ICONS[key];
          return (
            <Reveal key={key} delay={i * 0.08} y={14}>
              <article
                className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5 transition-shadow duration-200 hover:shadow-card"
                role="listitem"
              >
                {/* Icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: `${agent.hex}14` }}
                >
                  <IconComponent
                    size={22}
                    weight="duotone"
                    color={agent.hex}
                    aria-label={AGENT_ICON_ARIA[key]}
                  />
                </div>

                {/* Label + role */}
                <div className="flex flex-col gap-1">
                  <h3 className="font-display text-base font-semibold tracking-tightish text-fg">
                    {agent.label}
                  </h3>
                  <p className="text-sm leading-snug text-muted">{agent.role}</p>
                </div>

                {/* Model tier chip */}
                <div className="mt-auto pt-1">
                  <Chip tone={key}>{MODEL_TIER[key]}</Chip>
                </div>
              </article>
            </Reveal>
          );
        })}
      </div>

      {/* Blackboard diagram + explainer */}
      <Reveal delay={0.38}>
        <div className="mt-14 rounded-card border border-line bg-surface p-8">
          <h3 className="font-display text-lg font-semibold tracking-tightish text-fg">
            The blackboard
          </h3>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            {BLACKBOARD_DESC}
          </p>

          {/* Static diagram */}
          <div
            className="mt-8 flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:justify-center sm:gap-0"
            aria-label="Diagram: four agents write to one shared blackboard"
            role="img"
          >
            {/* Agent dots */}
            <div className="flex flex-row gap-4 sm:flex-col sm:gap-3">
              {AGENT_ORDER.map((key) => {
                const agent = AGENTS[key];
                return (
                  <div key={key} className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: agent.hex }}
                      aria-hidden="true"
                    />
                    <span className="hidden font-mono text-xs text-muted sm:inline">
                      {agent.label}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Connector lines — desktop horizontal, mobile vertical */}
            <div
              className="relative flex items-center justify-center sm:mx-8 sm:w-24"
              aria-hidden="true"
            >
              {/* Horizontal lines on sm+ */}
              <svg
                className="hidden sm:block"
                width="96"
                height="80"
                viewBox="0 0 96 80"
                fill="none"
              >
                {/* 4 lines converging to right center */}
                <line x1="0" y1="10" x2="80" y2="40" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="27" x2="80" y2="40" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="53" x2="80" y2="40" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <line x1="0" y1="70" x2="80" y2="40" stroke="#CBD5E1" strokeWidth="1" strokeDasharray="3 3" />
                <circle cx="80" cy="40" r="4" fill="#CBD5E1" />
              </svg>
              {/* Vertical arrow on mobile */}
              <svg
                className="block sm:hidden"
                width="16"
                height="36"
                viewBox="0 0 16 36"
                fill="none"
              >
                <line x1="8" y1="0" x2="8" y2="28" stroke="#CBD5E1" strokeWidth="1.5" strokeDasharray="3 3" />
                <path d="M4 24l4 4 4-4" stroke="#CBD5E1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>

            {/* Blackboard node */}
            <div className="flex flex-col items-center gap-1.5">
              <div className="rounded-card border border-line bg-fg/[0.04] px-5 py-3 text-center">
                <p className="font-mono text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                  session
                </p>
                <p className="mt-0.5 font-mono text-[10px] text-muted/50">
                  trace · hypotheses · patch · verdict
                </p>
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </Section>
  );
}
